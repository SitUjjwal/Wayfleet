import type {
  VehicleAvailability,
  VehicleCategory,
  VehicleStatus,
} from "@/types/domain";

export type CatalogVehicle = {
  id: string;
  category: VehicleCategory;
  brand: string;
  model: string;
  description?: string;
  images: string[];
  vendorName: string;
  vendorVerified: boolean;
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
};

export type ManagedVehicle = CatalogVehicle & {
  registrationNumber: string;
  status: VehicleStatus;
};
