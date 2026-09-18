import type { ManagedVehicle } from "@/features/vehicles/types";
import type { FieldErrors } from "@/lib/validation/auth-input";

export type VehicleApiFailure = {
  success: false;
  error: string;
  fields?: FieldErrors;
};

export type VehicleApiSuccess<T> = {
  success: true;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type VehicleApiResponse<T> = VehicleApiSuccess<T> | VehicleApiFailure;

export async function requestVehicleApi<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: VehicleApiResponse<T> }> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as VehicleApiResponse<T>;
  return { status: response.status, body };
}

export function toManagedVehicle(data: {
  id: string;
  category: ManagedVehicle["category"];
  brand: string;
  model: string;
  description?: string;
  images: string[];
  pricing: ManagedVehicle["pricing"];
  location: ManagedVehicle["location"];
  availability: ManagedVehicle["availability"];
  rating: ManagedVehicle["rating"];
  vendor: { businessName: string; verificationStatus: string };
  registrationNumber: string;
  status: ManagedVehicle["status"];
}): ManagedVehicle {
  return {
    id: data.id,
    category: data.category,
    brand: data.brand,
    model: data.model,
    description: data.description,
    images: data.images,
    vendorName: data.vendor.businessName,
    vendorVerified: data.vendor.verificationStatus === "verified",
    pricing: data.pricing,
    location: data.location,
    availability: data.availability,
    rating: data.rating,
    registrationNumber: data.registrationNumber,
    status: data.status,
  };
}
