import { toStoredLocation, parseLocationInput, GeoValidationError } from "@/lib/geo/validate";
import type { StoredLocation } from "@/lib/geo/types";
import { isVehicleAvailability, isVehicleCategory } from "@/lib/labels";
import { rupeesToMinorUnits } from "@/lib/money";
import { VehicleHttpError } from "@/server/vehicles/errors";
import type { VehicleAvailability, VehicleCategory, VehicleStatus } from "@/types/domain";

const FORBIDDEN_WRITE_KEYS = [
  "vendor",
  "vendorId",
  "vendor_id",
  "user",
  "userId",
  "rating",
  "_id",
  "id",
] as const;

const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const IMAGE_URL_PATTERN = /^https?:\/\/[^\s]+$/i;
const ALLOWED_PATCH_STATUS: readonly VehicleStatus[] = ["draft", "active", "inactive"];

export type VehicleWriteInput = {
  category: VehicleCategory;
  brand: string;
  model: string;
  registrationNumber: string;
  description: string;
  images: string[];
  pricing: {
    amount: number;
    currency: string;
    unit: "day";
  };
  location: StoredLocation;
  availability: VehicleAvailability;
};

export type VehiclePatchInput = Partial<VehicleWriteInput> & {
  status?: VehicleStatus;
};

function asBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new VehicleHttpError(422, "Validation error");
  }
  return body as Record<string, unknown>;
}

export function rejectUnauthorizedWriteFields(body: Record<string, unknown>): void {
  for (const key of FORBIDDEN_WRITE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      throw new VehicleHttpError(422, "Unauthorized field cannot be modified");
    }
  }
}

function parseImages(value: unknown): string[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }
  const parts = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (!parts) {
    throw new VehicleHttpError(422, "Validation error", {
      images: "Enter image URLs separated by commas",
    });
  }
  const images = parts.map((item) => item.trim()).filter(Boolean);
  if (images.length > 12) {
    throw new VehicleHttpError(422, "Validation error", {
      images: "Use at most 12 image URLs",
    });
  }
  for (const image of images) {
    if (!IMAGE_URL_PATTERN.test(image)) {
      throw new VehicleHttpError(422, "Validation error", {
        images: "Image URLs must start with http:// or https://",
      });
    }
  }
  return images;
}

function parseLocation(value: unknown): StoredLocation {
  try {
    return toStoredLocation(parseLocationInput(value, "location"));
  } catch (error) {
    if (error instanceof GeoValidationError) {
      throw new VehicleHttpError(422, "Validation error", {
        location: error.message,
      });
    }
    throw error;
  }
}

function parsePriceMinorUnits(body: Record<string, unknown>): number {
  if (body.priceRupees !== undefined && body.priceRupees !== null && body.priceRupees !== "") {
    const rupees =
      typeof body.priceRupees === "number" ? body.priceRupees : Number(body.priceRupees);
    if (!Number.isInteger(rupees) || rupees < 0) {
      throw new VehicleHttpError(422, "Validation error", {
        priceRupees: "Enter a whole-rupee price of 0 or more",
      });
    }
    return rupeesToMinorUnits(rupees);
  }
  if (body.pricing && typeof body.pricing === "object" && !Array.isArray(body.pricing)) {
    const amount = (body.pricing as { amount?: unknown }).amount;
    const parsed = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new VehicleHttpError(422, "Validation error", {
        priceRupees: "Enter a whole-rupee price of 0 or more",
      });
    }
    return parsed;
  }
  throw new VehicleHttpError(422, "Validation error", {
    priceRupees: "Enter a whole-rupee price of 0 or more",
  });
}

function parseCurrency(body: Record<string, unknown>): string {
  const fromPricing =
    body.pricing && typeof body.pricing === "object" && !Array.isArray(body.pricing)
      ? (body.pricing as { currency?: unknown }).currency
      : undefined;
  const raw = typeof body.currency === "string" ? body.currency : fromPricing;
  const currency =
    typeof raw === "string" && raw.trim() ? raw.trim().toUpperCase() : "INR";
  if (!CURRENCY_PATTERN.test(currency)) {
    throw new VehicleHttpError(422, "Validation error", {
      currency: "Currency must be a 3-letter ISO code",
    });
  }
  return currency;
}

function requiredString(value: unknown, field: string, message: string): string {
  const parsed = typeof value === "string" ? value.trim() : "";
  if (!parsed) {
    throw new VehicleHttpError(422, "Validation error", { [field]: message });
  }
  return parsed;
}

export function parseVehicleCreateBody(body: unknown): VehicleWriteInput {
  const input = asBody(body);
  rejectUnauthorizedWriteFields(input);

  const categoryRaw = typeof input.category === "string" ? input.category : "";
  if (!isVehicleCategory(categoryRaw)) {
    throw new VehicleHttpError(422, "Validation error", {
      category: "Choose a vehicle category",
    });
  }
  const availabilityRaw = typeof input.availability === "string" ? input.availability : "";
  if (!isVehicleAvailability(availabilityRaw)) {
    throw new VehicleHttpError(422, "Validation error", {
      availability: "Choose availability",
    });
  }

  return {
    category: categoryRaw,
    brand: requiredString(input.brand, "brand", "Enter the brand"),
    model: requiredString(input.model, "model", "Enter the model"),
    registrationNumber: requiredString(
      input.registrationNumber,
      "registrationNumber",
      "Enter the registration number",
    ).toUpperCase(),
    description: typeof input.description === "string" ? input.description.trim() : "",
    images: parseImages(input.images),
    pricing: {
      amount: parsePriceMinorUnits(input),
      currency: parseCurrency(input),
      unit: "day",
    },
    location: parseLocation(input.location),
    availability: availabilityRaw,
  };
}

export function parseVehiclePatchBody(body: unknown): VehiclePatchInput {
  const input = asBody(body);
  rejectUnauthorizedWriteFields(input);
  const patch: VehiclePatchInput = {};

  if (input.category !== undefined) {
    const categoryRaw = typeof input.category === "string" ? input.category : "";
    if (!isVehicleCategory(categoryRaw)) {
      throw new VehicleHttpError(422, "Validation error", {
        category: "Choose a vehicle category",
      });
    }
    patch.category = categoryRaw;
  }
  if (input.brand !== undefined) {
    patch.brand = requiredString(input.brand, "brand", "Enter the brand");
  }
  if (input.model !== undefined) {
    patch.model = requiredString(input.model, "model", "Enter the model");
  }
  if (input.registrationNumber !== undefined) {
    patch.registrationNumber = requiredString(
      input.registrationNumber,
      "registrationNumber",
      "Enter the registration number",
    ).toUpperCase();
  }
  if (input.description !== undefined) {
    patch.description =
      typeof input.description === "string" ? input.description.trim() : "";
  }
  if (input.images !== undefined) {
    patch.images = parseImages(input.images);
  }
  if (input.priceRupees !== undefined || input.pricing !== undefined) {
    patch.pricing = {
      amount: parsePriceMinorUnits(input),
      currency: parseCurrency(input),
      unit: "day",
    };
  } else if (input.currency !== undefined) {
    patch.pricing = {
      amount: 0,
      currency: parseCurrency(input),
      unit: "day",
    };
    throw new VehicleHttpError(422, "Validation error", {
      priceRupees: "Price is required when changing currency",
    });
  }
  if (input.location !== undefined) {
    patch.location = parseLocation(input.location);
  }
  if (input.availability !== undefined) {
    const availabilityRaw = typeof input.availability === "string" ? input.availability : "";
    if (!isVehicleAvailability(availabilityRaw)) {
      throw new VehicleHttpError(422, "Validation error", {
        availability: "Choose availability",
      });
    }
    patch.availability = availabilityRaw;
  }
  if (input.status !== undefined) {
    const statusRaw = typeof input.status === "string" ? input.status : "";
    if (!(ALLOWED_PATCH_STATUS as readonly string[]).includes(statusRaw)) {
      throw new VehicleHttpError(422, "Unauthorized field cannot be modified");
    }
    patch.status = statusRaw as VehicleStatus;
  }

  if (Object.keys(patch).length === 0) {
    throw new VehicleHttpError(422, "Validation error");
  }

  return patch;
}
