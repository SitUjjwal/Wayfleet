import "server-only";

import type { Types } from "mongoose";
import { calculateBookingAmount } from "@/lib/booking/pricing";
import {
  BLOCKING_BOOKING_STATUSES,
  resolveBookingTransition,
} from "@/lib/booking/transitions";
import { connectDb, isMongoConfigured, isValidObjectId } from "@/lib/db";
import { sanitizeDbError } from "@/lib/db/connect";
import { BookingModel, type Booking } from "@/models/booking";
import { UserModel } from "@/models/user";
import { VehicleModel } from "@/models/vehicle";
import { VendorModel } from "@/models/vendor";
import type { SessionUser } from "@/server/auth/types";
import type { BookingDto } from "@/server/bookings/dto";
import { BookingHttpError } from "@/server/bookings/errors";
import {
  parseBookingCreateBody,
  parseBookingPatchBody,
} from "@/server/bookings/input";
import {
  bookingMongoSort,
  type BookingListQuery,
} from "@/server/bookings/list-query";
import { requireVendorProfile } from "@/server/vendors/profile";
import type { PricingUnit, UserRole } from "@/types/domain";

type BookingListResult = {
  data: BookingDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type LeanBooking = Booking & {
  _id: Types.ObjectId;
};

type HydratedBooking = Booking & {
  _id: Types.ObjectId;
  save: () => Promise<HydratedBooking>;
  toObject: () => LeanBooking;
  deleteOne: () => Promise<unknown>;
};

function requireMongoForBookings(): void {
  if (!isMongoConfigured()) {
    throw new BookingHttpError(503, "Database unavailable");
  }
}

function asPricingUnit(unit: string): PricingUnit {
  if (unit === "hour" || unit === "day" || unit === "trip") {
    return unit;
  }
  return "day";
}

function locationDto(location: {
  label: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  point?: { type: "Point"; coordinates: [number, number] };
}) {
  const dto: {
    label: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  } = {
    label: location.label,
    address: location.label,
    ...(location.city ? { city: location.city } : {}),
    ...(location.state ? { state: location.state } : {}),
    ...(location.country ? { country: location.country } : {}),
  };
  const latitude = location.lat ?? location.point?.coordinates[1];
  const longitude = location.lng ?? location.point?.coordinates[0];
  if (latitude !== undefined && longitude !== undefined) {
    dto.latitude = latitude;
    dto.longitude = longitude;
  }
  return dto;
}

function toBookingDto(
  doc: LeanBooking,
  audience: UserRole,
  customer?: { id: string; name: string; email?: string },
): BookingDto {
  const dto: BookingDto = {
    id: doc._id.toString(),
    vehicle: {
      id: doc.vehicle.toString(),
      displayName: doc.snapshot.vehicleDisplayName,
    },
    vendor: {
      id: doc.vendor.toString(),
      businessName: doc.snapshot.vendorBusinessName,
    },
    pickup: locationDto(doc.pickupLocation),
    destination: locationDto(doc.destination),
    startsAt: doc.startsAt.toISOString(),
    endsAt: doc.endsAt.toISOString(),
    amount: doc.amount,
    currency: doc.currency,
    bookingStatus: doc.bookingStatus,
    paymentStatus: doc.paymentStatus,
    snapshot: {
      vehicleDisplayName: doc.snapshot.vehicleDisplayName,
      vendorBusinessName: doc.snapshot.vendorBusinessName,
      unitAmount: doc.snapshot.unitAmount,
      currency: doc.snapshot.currency,
      unit: doc.snapshot.unit,
    },
    createdAt: doc.createdAt.toISOString(),
  };
  if (doc.cancellation) {
    dto.cancellation = {
      cancelledAt: doc.cancellation.cancelledAt.toISOString(),
      cancelledByRole: doc.cancellation.cancelledByRole,
      ...(doc.cancellation.reason ? { reason: doc.cancellation.reason } : {}),
    };
  }
  if (audience === "vendor" && customer) {
    dto.customer = customer;
  }
  return dto;
}

async function overlappingCount(
  vehicleId: string,
  startsAt: Date,
  endsAt: Date,
  exceptId?: string,
): Promise<number> {
  const filter: Record<string, unknown> = {
    vehicle: vehicleId,
    bookingStatus: { $in: [...BLOCKING_BOOKING_STATUSES] },
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
  };
  if (exceptId) {
    filter._id = { $ne: exceptId };
  }
  return BookingModel.countDocuments(filter);
}

export async function assertVehicleBookableForWindow(
  vehicleId: string,
  startsAt: Date,
  endsAt: Date,
  exceptId?: string,
): Promise<void> {
  const conflicts = await overlappingCount(vehicleId, startsAt, endsAt, exceptId);
  if (conflicts > 0) {
    throw new BookingHttpError(409, "BOOKING_CONFLICT");
  }
}

async function loadCustomerSummary(customerId: string) {
  const user = await UserModel.findById(customerId).select("name email");
  if (!user) {
    return undefined;
  }
  return {
    id: user._id.toString(),
    name: user.name,
    ...(user.email ? { email: user.email } : {}),
  };
}

async function authorizeBookingAccess(user: SessionUser, booking: LeanBooking) {
  if (user.role === "customer") {
    if (booking.customer.toString() !== user.id) {
      throw new BookingHttpError(403, "Forbidden");
    }
    return { audience: "customer" as const, customer: undefined };
  }
  if (user.role === "vendor") {
    const vendor = await requireVendorProfile(user);
    if (booking.vendor.toString() !== vendor._id.toString()) {
      throw new BookingHttpError(403, "Forbidden");
    }
    return {
      audience: "vendor" as const,
      customer: await loadCustomerSummary(booking.customer.toString()),
    };
  }
  throw new BookingHttpError(403, "Forbidden");
}

export async function createBookingForCustomer(
  user: SessionUser,
  body: unknown,
): Promise<BookingDto> {
  if (user.role !== "customer") {
    throw new BookingHttpError(403, "Forbidden");
  }
  const input = parseBookingCreateBody(body);
  requireMongoForBookings();
  await connectDb();

  const vehicle = await VehicleModel.findById(input.vehicleId).populate({
    path: "vendor",
    select: "businessName",
  });
  if (!vehicle) {
    throw new BookingHttpError(404, "Vehicle not found");
  }
  if (vehicle.status !== "active") {
    throw new BookingHttpError(422, "Validation error", {
      vehicleId: "This vehicle is not available to book",
    });
  }
  if (vehicle.availability !== "available") {
    throw new BookingHttpError(422, "Validation error", {
      vehicleId: "This vehicle is not available to book",
    });
  }
  let vendorId = "";
  let vendorBusinessName = "";
  if (
    vehicle.vendor &&
    typeof vehicle.vendor === "object" &&
    "_id" in vehicle.vendor &&
    "businessName" in vehicle.vendor
  ) {
    vendorId = String((vehicle.vendor as { _id: Types.ObjectId })._id);
    vendorBusinessName = String(
      (vehicle.vendor as { businessName: unknown }).businessName ?? "",
    );
  } else {
    const vendorRecord = await VendorModel.findById(vehicle.vendor).select(
      "businessName",
    );
    vendorId = vendorRecord?._id.toString() ?? "";
    vendorBusinessName = vendorRecord?.businessName ?? "";
  }
  if (!vendorId || !vendorBusinessName) {
    throw new BookingHttpError(422, "Validation error", {
      vehicleId: "This vehicle has no vendor",
    });
  }

  const unit = asPricingUnit(vehicle.pricing.unit);
  const amount = calculateBookingAmount({
    unitAmount: vehicle.pricing.amount,
    unit,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  });

  await assertVehicleBookableForWindow(input.vehicleId, input.startsAt, input.endsAt);

  let created;
  try {
    created = await BookingModel.create({
      customer: user.id,
      vendor: vendorId,
      vehicle: vehicle._id,
      pickupLocation: input.pickup,
      destination: input.destination,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      amount,
      currency: vehicle.pricing.currency,
      bookingStatus: "pending",
      paymentStatus: "unpaid",
      snapshot: {
        vehicleDisplayName: `${vehicle.brand} ${vehicle.model}`.trim(),
        vendorBusinessName,
        unitAmount: vehicle.pricing.amount,
        currency: vehicle.pricing.currency,
        unit,
      },
    });
  } catch (error) {
    console.error("Booking create failed", { message: sanitizeDbError(error) });
    throw new BookingHttpError(500, "Internal server error");
  }

  const conflicts = await overlappingCount(
    input.vehicleId,
    input.startsAt,
    input.endsAt,
    created._id.toString(),
  );
  if (conflicts > 0) {
    await BookingModel.deleteOne({ _id: created._id });
    throw new BookingHttpError(409, "BOOKING_CONFLICT");
  }

  return toBookingDto(created.toObject() as LeanBooking, "customer");
}

export async function listBookingsForUser(
  user: SessionUser,
  query: BookingListQuery,
): Promise<BookingListResult> {
  requireMongoForBookings();
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (user.role === "customer") {
    filter.customer = user.id;
  } else if (user.role === "vendor") {
    const vendor = await requireVendorProfile(user);
    filter.vendor = vendor._id;
  } else {
    throw new BookingHttpError(403, "Forbidden");
  }
  if (query.status) {
    filter.bookingStatus = query.status;
  }
  const skip = (query.page - 1) * query.limit;
  const [total, docs] = await Promise.all([
    BookingModel.countDocuments(filter),
    BookingModel.find(filter)
      .sort(bookingMongoSort(query.sort))
      .skip(skip)
      .limit(query.limit)
      .lean<LeanBooking[]>(),
  ]);
  const customerMap = new Map<string, { id: string; name: string; email?: string }>();
  if (user.role === "vendor" && docs.length > 0) {
    const ids = [...new Set(docs.map((doc) => doc.customer.toString()))];
    const users = await UserModel.find({ _id: { $in: ids } }).select("name email");
    for (const item of users) {
      customerMap.set(item._id.toString(), {
        id: item._id.toString(),
        name: item.name,
        ...(item.email ? { email: item.email } : {}),
      });
    }
  }
  const data = docs.map((doc) =>
    toBookingDto(doc, user.role, customerMap.get(doc.customer.toString())),
  );
  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export async function getBookingForUser(
  user: SessionUser,
  id: string,
): Promise<BookingDto> {
  if (!isValidObjectId(id)) {
    throw new BookingHttpError(400, "Invalid booking id");
  }
  requireMongoForBookings();
  await connectDb();
  const doc = await BookingModel.findById(id).lean<LeanBooking | null>();
  if (!doc) {
    throw new BookingHttpError(404, "Booking not found");
  }
  const access = await authorizeBookingAccess(user, doc);
  return toBookingDto(doc, access.audience, access.customer);
}

export async function transitionBookingForUser(
  user: SessionUser,
  id: string,
  body: unknown,
): Promise<BookingDto> {
  const patch = parseBookingPatchBody(body);
  if (!isValidObjectId(id)) {
    throw new BookingHttpError(400, "Invalid booking id");
  }
  requireMongoForBookings();
  await connectDb();
  const booking = (await BookingModel.findById(id)) as HydratedBooking | null;
  if (!booking) {
    throw new BookingHttpError(404, "Booking not found");
  }
  const access = await authorizeBookingAccess(user, booking);
  let nextStatus: ReturnType<typeof resolveBookingTransition>;
  try {
    nextStatus = resolveBookingTransition(booking.bookingStatus, patch.action, user.role);
  } catch {
    throw new BookingHttpError(409, "BOOKING_INVALID_TRANSITION");
  }
  if (access.audience === "vendor" && patch.action === "cancel") {
    throw new BookingHttpError(409, "BOOKING_INVALID_TRANSITION");
  }
  booking.bookingStatus = nextStatus;
  if (patch.action === "cancel") {
    booking.cancellation = {
      cancelledAt: new Date(),
      cancelledBy: booking.customer,
      cancelledByRole: "customer",
      ...(patch.reason ? { reason: patch.reason } : {}),
    };
  }
  await booking.save();
  return toBookingDto(booking.toObject(), access.audience, access.customer);
}
