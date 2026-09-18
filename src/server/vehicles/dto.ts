import type { CatalogVehicle, ManagedVehicle } from "@/features/vehicles/types";
import type {
  VehicleAvailability,
  VehicleCategory,
  VehicleStatus,
  VerificationStatus,
} from "@/types/domain";

export type PublicVendorSummary = {
  id: string;
  businessName: string;
  verificationStatus: VerificationStatus;
  rating: {
    average: number;
    count: number;
  };
};

export type PublicVehicle = {
  id: string;
  category: VehicleCategory;
  brand: string;
  model: string;
  description: string;
  images: string[];
  pricing: {
    amount: number;
    currency: string;
    unit: string;
  };
  location: {
    label: string;
    city?: string;
    state?: string;
    country?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    distanceMeters?: number;
  };
  availability: VehicleAvailability;
  rating: {
    average: number;
    count: number;
  };
  vendor: PublicVendorSummary;
  createdAt: string;
};

export type ManagedVehicleDto = PublicVehicle & {
  registrationNumber: string;
  status: VehicleStatus;
};

export function toCatalogVehicle(vehicle: PublicVehicle): CatalogVehicle {
  return {
    id: vehicle.id,
    category: vehicle.category,
    brand: vehicle.brand,
    model: vehicle.model,
    description: vehicle.description,
    images: vehicle.images,
    vendorName: vehicle.vendor.businessName,
    vendorVerified: vehicle.vendor.verificationStatus === "verified",
    pricing: vehicle.pricing,
    location: vehicle.location,
    availability: vehicle.availability,
    rating: vehicle.rating,
  };
}

export function toManagedCatalog(vehicle: ManagedVehicleDto): ManagedVehicle {
  return {
    ...toCatalogVehicle(vehicle),
    registrationNumber: vehicle.registrationNumber,
    status: vehicle.status,
  };
}

const PRIVATE_FIELD_NAMES = [
  "registrationNumber",
  "passwordHash",
  "contact",
  "kycStatus",
  "googleSubject",
  "vendorId",
] as const;

export function publicPayloadContainsPrivateFields(payload: unknown): boolean {
  const json = JSON.stringify(payload);
  return PRIVATE_FIELD_NAMES.some((key) => json.includes(`"${key}"`));
}
