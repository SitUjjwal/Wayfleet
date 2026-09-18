import "server-only";

import type { Types } from "mongoose";
import { geoNearStage } from "@/lib/geo/nearby";
import {
  generalizePublicLocation,
  storedLocationFromDocument,
  toPreciseLocation,
} from "@/lib/geo/validate";
import { connectDb, isValidObjectId } from "@/lib/db";
import { sanitizeDbError } from "@/lib/db/connect";
import { VehicleModel, type Vehicle } from "@/models/vehicle";
import type { VendorDocument } from "@/models/vendor";
import { AuthHttpError } from "@/server/auth/http-error";
import type { SessionUser } from "@/server/auth/types";
import {
  type ManagedVehicleDto,
  type PublicVehicle,
  type PublicVendorSummary,
} from "@/server/vehicles/dto";
import { isDuplicateKeyError, VehicleHttpError } from "@/server/vehicles/errors";
import {
  parseVehicleCreateBody,
  parseVehiclePatchBody,
  type VehiclePatchInput,
} from "@/server/vehicles/input";
import { mongoSort, type VehicleListQuery } from "@/server/vehicles/list-query";
import { assertOwnsVehicle, vendorIdFromAuthenticatedVendor } from "@/server/vehicles/ownership";
import { buildVehicleListFilter } from "@/server/vehicles/query-builder";
import { requireMongoForVehicles, requireVendorProfile } from "@/server/vendors/profile";
import type { VerificationStatus } from "@/types/domain";

const PUBLIC_VENDOR_SELECT = "businessName verificationStatus rating";
const VEHICLE_PUBLIC_SELECT =
  "category brand model description images pricing location availability rating vendor status createdAt";
const VEHICLE_MANAGED_SELECT = `${VEHICLE_PUBLIC_SELECT} registrationNumber`;

type LeanVendor = {
  _id: Types.ObjectId;
  businessName: string;
  verificationStatus: VerificationStatus;
  rating: { average: number; count: number };
};

type LeanVehicle = {
  _id: Types.ObjectId;
  vendor: LeanVendor | Types.ObjectId;
  category: PublicVehicle["category"];
  brand: string;
  model: string;
  description?: string;
  images: string[];
  pricing: PublicVehicle["pricing"];
  location: {
    label: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
    point?: { type: "Point"; coordinates: [number, number] };
  };
  availability: PublicVehicle["availability"];
  rating?: { average: number; count: number };
  status: ManagedVehicleDto["status"];
  registrationNumber?: string;
  createdAt: Date;
  distanceMeters?: number;
};

export type VehicleListResult<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function toVendorSummary(vendor: LeanVendor): PublicVendorSummary {
  return {
    id: vendor._id.toString(),
    businessName: vendor.businessName,
    verificationStatus: vendor.verificationStatus,
    rating: {
      average: vendor.rating?.average ?? 0,
      count: vendor.rating?.count ?? 0,
    },
  };
}

function toPublicVehicle(doc: LeanVehicle, vendor: LeanVendor): PublicVehicle {
  return {
    id: doc._id.toString(),
    category: doc.category,
    brand: doc.brand,
    model: doc.model,
    description: doc.description ?? "",
    images: doc.images ?? [],
    pricing: {
      amount: doc.pricing.amount,
      currency: doc.pricing.currency,
      unit: doc.pricing.unit,
    },
    location: publicLocationDto(doc, false),
    availability: doc.availability,
    rating: {
      average: doc.rating?.average ?? 0,
      count: doc.rating?.count ?? 0,
    },
    vendor: toVendorSummary(vendor),
    createdAt: doc.createdAt.toISOString(),
  };
}

function publicLocationDto(
  doc: LeanVehicle,
  managed: boolean,
): PublicVehicle["location"] {
  const stored = storedLocationFromDocument(doc.location);
  if (managed) {
    const precise = toPreciseLocation(stored);
    return {
      label: precise.label,
      address: precise.address,
      ...(precise.city ? { city: precise.city } : {}),
      ...(precise.state ? { state: precise.state } : {}),
      ...(precise.country ? { country: precise.country } : {}),
      latitude: precise.latitude,
      longitude: precise.longitude,
      ...(doc.distanceMeters !== undefined
        ? { distanceMeters: Math.round(doc.distanceMeters) }
        : {}),
    };
  }
  return generalizePublicLocation(stored, doc.distanceMeters);
}

function toManagedVehicle(doc: LeanVehicle, vendor: LeanVendor): ManagedVehicleDto {
  return {
    ...toPublicVehicle(doc, vendor),
    location: publicLocationDto(doc, true),
    registrationNumber: doc.registrationNumber ?? "",
    status: doc.status,
  };
}

function populatedVendor(value: LeanVehicle["vendor"]): LeanVendor | null {
  if (!value || typeof value !== "object" || !("_id" in value) || !("businessName" in value)) {
    return null;
  }
  return value as LeanVendor;
}

async function queryVehicles(
  filter: Record<string, unknown>,
  query: VehicleListQuery,
  managed: boolean,
): Promise<LeanVehicle[]> {
  const skip = (query.page - 1) * query.limit;
  return VehicleModel.find(filter)
    .select(managed ? VEHICLE_MANAGED_SELECT : VEHICLE_PUBLIC_SELECT)
    .populate({ path: "vendor", select: PUBLIC_VENDOR_SELECT })
    .sort(mongoSort(query.sort))
    .skip(skip)
    .limit(query.limit)
    .lean<LeanVehicle[]>();
}

async function queryVehiclesNearby(
  filter: Record<string, unknown>,
  query: VehicleListQuery,
  managed: boolean,
): Promise<{ total: number; docs: LeanVehicle[] }> {
  if (!query.nearby) {
    return { total: 0, docs: [] };
  }
  const skip = (query.page - 1) * query.limit;
  const sortAfter =
    query.sort === "recommended"
      ? { distanceMeters: 1 as const }
      : { ...mongoSort(query.sort), distanceMeters: 1 as const };
  const [countRows, idRows] = await Promise.all([
    VehicleModel.aggregate<{ total: number }>([
      geoNearStage(query.nearby, filter),
      { $count: "total" },
    ]),
    VehicleModel.aggregate<{ _id: Types.ObjectId; distanceMeters: number }>([
      geoNearStage(query.nearby, filter),
      { $sort: sortAfter },
      { $skip: skip },
      { $limit: query.limit },
      { $project: { _id: 1, distanceMeters: 1 } },
    ]),
  ]);
  const total = countRows[0]?.total ?? 0;
  if (idRows.length === 0) {
    return { total, docs: [] };
  }
  const distanceById = new Map(
    idRows.map((row) => [row._id.toString(), row.distanceMeters]),
  );
  const found = await VehicleModel.find({
    _id: { $in: idRows.map((row) => row._id) },
  })
    .select(managed ? VEHICLE_MANAGED_SELECT : VEHICLE_PUBLIC_SELECT)
    .populate({ path: "vendor", select: PUBLIC_VENDOR_SELECT })
    .lean<LeanVehicle[]>();
  const byId = new Map(found.map((doc) => [doc._id.toString(), doc]));
  const docs: LeanVehicle[] = [];
  for (const row of idRows) {
    const doc = byId.get(row._id.toString());
    if (!doc) {
      continue;
    }
    docs.push({
      ...doc,
      distanceMeters: distanceById.get(row._id.toString()),
    });
  }
  return { total, docs };
}

async function listVehicles<T extends PublicVehicle | ManagedVehicleDto>(
  query: VehicleListQuery,
  options: { vendorId?: string; publicOnly: boolean },
  managed: boolean,
): Promise<VehicleListResult<T>> {
  const filter = buildVehicleListFilter(query, options);
  if (query.nearby) {
    const { total, docs } = await queryVehiclesNearby(filter, query, managed);
    return {
      data: mapList(docs, managed) as T[],
      pagination: paginationMeta(query.page, query.limit, total),
    };
  }
  const [total, docs] = await Promise.all([
    VehicleModel.countDocuments(filter),
    queryVehicles(filter, query, managed),
  ]);
  return {
    data: mapList(docs, managed) as T[],
    pagination: paginationMeta(query.page, query.limit, total),
  };
}

function mapList(docs: LeanVehicle[], managed: boolean) {
  const items: Array<PublicVehicle | ManagedVehicleDto> = [];
  for (const doc of docs) {
    const vendor = populatedVendor(doc.vendor);
    if (!vendor) {
      continue;
    }
    items.push(managed ? toManagedVehicle(doc, vendor) : toPublicVehicle(doc, vendor));
  }
  return items;
}

function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function duplicateRegistrationError(): VehicleHttpError {
  return new VehicleHttpError(409, "Duplicate vehicle registration");
}

function wrapWriteError(error: unknown): never {
  if (error instanceof VehicleHttpError || error instanceof AuthHttpError) {
    throw error;
  }
  if (isDuplicateKeyError(error)) {
    throw duplicateRegistrationError();
  }
  console.error("Vehicle write failed", { message: sanitizeDbError(error) });
  throw new VehicleHttpError(500, "Internal server error");
}

export async function listPublicVehicles(
  query: VehicleListQuery,
): Promise<VehicleListResult<PublicVehicle>> {
  requireMongoForVehicles();
  await connectDb();
  return listVehicles<PublicVehicle>(query, { publicOnly: true }, false);
}

export async function listVendorVehicles(
  user: SessionUser,
  query: VehicleListQuery,
): Promise<VehicleListResult<ManagedVehicleDto>> {
  requireMongoForVehicles();
  const vendor = await requireVendorProfile(user);
  return listVehicles<ManagedVehicleDto>(
    query,
    {
      publicOnly: false,
      vendorId: vendorIdFromAuthenticatedVendor(vendor._id.toString()),
    },
    true,
  );
}

export async function getPublicVehicleById(id: string): Promise<PublicVehicle> {
  if (!isValidObjectId(id)) {
    throw new VehicleHttpError(400, "Invalid vehicle id");
  }
  requireMongoForVehicles();
  await connectDb();
  const doc = await VehicleModel.findOne({ _id: id, status: "active" })
    .select(VEHICLE_PUBLIC_SELECT)
    .populate({ path: "vendor", select: PUBLIC_VENDOR_SELECT })
    .lean<LeanVehicle | null>();
  const vendor = doc ? populatedVendor(doc.vendor) : null;
  if (!doc || !vendor) {
    throw new VehicleHttpError(404, "Vehicle not found");
  }
  return toPublicVehicle(doc, vendor);
}

type HydratedVehicle = Vehicle & {
  save: () => Promise<HydratedVehicle>;
  toObject: () => LeanVehicle;
};

async function loadOwnedVehicle(
  user: SessionUser,
  id: string,
): Promise<{ vendor: VendorDocument; vehicle: HydratedVehicle }> {
  if (!isValidObjectId(id)) {
    throw new VehicleHttpError(400, "Invalid vehicle id");
  }
  requireMongoForVehicles();
  const vendor = await requireVendorProfile(user);
  const vehicle = await VehicleModel.findById(id);
  if (!vehicle) {
    throw new VehicleHttpError(404, "Vehicle not found");
  }
  const owned = vehicle as unknown as HydratedVehicle;
  assertOwnsVehicle(String(owned.vendor), vendor._id.toString());
  return { vendor, vehicle: owned };
}

export async function createVehicleForVendor(
  user: SessionUser,
  body: unknown,
): Promise<ManagedVehicleDto> {
  const input = parseVehicleCreateBody(body);
  try {
    requireMongoForVehicles();
    const vendor = await requireVendorProfile(user);
    const created = await VehicleModel.create({
      vendor: vendorIdFromAuthenticatedVendor(vendor._id.toString()),
      category: input.category,
      brand: input.brand,
      model: input.model,
      registrationNumber: input.registrationNumber,
      description: input.description,
      images: input.images,
      pricing: input.pricing,
      location: input.location,
      availability: input.availability,
      status: "active",
      rating: { average: 0, count: 0 },
    });
    return toManagedVehicle(created.toObject() as LeanVehicle, {
      _id: vendor._id,
      businessName: vendor.businessName,
      verificationStatus: vendor.verificationStatus,
      rating: vendor.rating,
    });
  } catch (error) {
    wrapWriteError(error);
  }
}

function applyPatch(vehicle: HydratedVehicle, patch: VehiclePatchInput): void {
  if (patch.category) {
    vehicle.category = patch.category;
  }
  if (patch.brand) {
    vehicle.brand = patch.brand;
  }
  if (patch.model) {
    vehicle.model = patch.model;
  }
  if (patch.registrationNumber) {
    vehicle.registrationNumber = patch.registrationNumber;
  }
  if (patch.description !== undefined) {
    vehicle.description = patch.description;
  }
  if (patch.images) {
    vehicle.images = patch.images;
  }
  if (patch.pricing) {
    vehicle.pricing.amount = patch.pricing.amount;
    vehicle.pricing.currency = patch.pricing.currency;
    vehicle.pricing.unit = patch.pricing.unit;
  }
  if (patch.location) {
    vehicle.location.label = patch.location.label;
    vehicle.location.city = patch.location.city;
    vehicle.location.state = patch.location.state;
    vehicle.location.country = patch.location.country;
    vehicle.location.lat = patch.location.lat;
    vehicle.location.lng = patch.location.lng;
    vehicle.location.point = patch.location.point;
  }
  if (patch.availability) {
    vehicle.availability = patch.availability;
  }
  if (patch.status) {
    vehicle.status = patch.status;
  }
}

export async function updateVehicleForVendor(
  user: SessionUser,
  id: string,
  body: unknown,
): Promise<ManagedVehicleDto> {
  const patch = parseVehiclePatchBody(body);
  try {
    const { vendor, vehicle } = await loadOwnedVehicle(user, id);
    applyPatch(vehicle, patch);
    await vehicle.save();
    return toManagedVehicle(vehicle.toObject() as LeanVehicle, {
      _id: vendor._id,
      businessName: vendor.businessName,
      verificationStatus: vendor.verificationStatus,
      rating: vendor.rating,
    });
  } catch (error) {
    wrapWriteError(error);
  }
}

export async function inactivateVehicleForVendor(
  user: SessionUser,
  id: string,
): Promise<ManagedVehicleDto> {
  try {
    const { vendor, vehicle } = await loadOwnedVehicle(user, id);
    vehicle.status = "inactive";
    await vehicle.save();
    return toManagedVehicle(vehicle.toObject() as LeanVehicle, {
      _id: vendor._id,
      businessName: vendor.businessName,
      verificationStatus: vendor.verificationStatus,
      rating: vendor.rating,
    });
  } catch (error) {
    wrapWriteError(error);
  }
}
