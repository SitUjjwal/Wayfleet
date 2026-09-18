import { VEHICLE_CATEGORIES, type VehicleAvailability, type VehicleCategory } from "@/types/domain";
import type { LocationInput } from "@/lib/geo/types";
import { GeoValidationError, parseLocationInput } from "@/lib/geo/validate";
import { isVehicleAvailability, isVehicleCategory } from "@/lib/labels";
import type { FieldErrors } from "@/lib/validation/auth-input";

export type VehicleFormInput = {
  category: VehicleCategory;
  brand: string;
  model: string;
  registrationNumber: string;
  priceRupees: number;
  description: string;
  images: string;
  location: LocationInput;
  availability: VehicleAvailability;
};

function readLocation(input: { location?: unknown; locationJson?: unknown }): unknown {
  if (typeof input.locationJson === "string" && input.locationJson.trim()) {
    try {
      return JSON.parse(input.locationJson) as unknown;
    } catch {
      return input.locationJson;
    }
  }
  return input.location;
}

export function parseVehicleFormInput(input: {
  category?: unknown;
  brand?: unknown;
  model?: unknown;
  registrationNumber?: unknown;
  priceRupees?: unknown;
  description?: unknown;
  images?: unknown;
  location?: unknown;
  locationJson?: unknown;
  availability?: unknown;
}): { data?: VehicleFormInput; fields?: FieldErrors } {
  const fields: FieldErrors = {};
  const brand = typeof input.brand === "string" ? input.brand.trim() : "";
  const model = typeof input.model === "string" ? input.model.trim() : "";
  const registrationNumber =
    typeof input.registrationNumber === "string"
      ? input.registrationNumber.trim().toUpperCase()
      : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const images = typeof input.images === "string" ? input.images.trim() : "";
  const categoryRaw = typeof input.category === "string" ? input.category : "";
  const availabilityRaw =
    typeof input.availability === "string" ? input.availability : "";
  const priceSource = input.priceRupees;
  const priceRaw =
    priceSource === "" || priceSource === undefined || priceSource === null
      ? Number.NaN
      : typeof priceSource === "number"
        ? priceSource
        : Number(priceSource);

  if (!isVehicleCategory(categoryRaw)) {
    fields.category = "Choose a vehicle category";
  }
  if (!brand) {
    fields.brand = "Enter the brand";
  }
  if (!model) {
    fields.model = "Enter the model";
  }
  if (!registrationNumber) {
    fields.registrationNumber = "Enter the registration number";
  }
  if (!Number.isInteger(priceRaw) || priceRaw < 0) {
    fields.priceRupees = "Enter a whole-rupee price of 0 or more";
  }
  let location: LocationInput | undefined;
  try {
    location = parseLocationInput(readLocation(input), "location");
  } catch (error) {
    fields.location =
      error instanceof GeoValidationError
        ? error.message
        : "Select a location with valid coordinates";
  }
  if (!isVehicleAvailability(availabilityRaw)) {
    fields.availability = "Choose availability";
  }

  if (Object.keys(fields).length > 0 || !location) {
    return { fields };
  }

  return {
    data: {
      category: categoryRaw as VehicleCategory,
      brand,
      model,
      registrationNumber,
      priceRupees: priceRaw,
      description,
      images,
      location,
      availability: availabilityRaw as VehicleAvailability,
    },
  };
}

export const VEHICLE_FORM_CATEGORIES = VEHICLE_CATEGORIES;
