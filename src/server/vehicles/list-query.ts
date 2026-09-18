import { parseNearbySearch } from "@/lib/geo/nearby";
import type { NearbySearch } from "@/lib/geo/types";
import { GeoValidationError } from "@/lib/geo/validate";
import { isVehicleAvailability, isVehicleCategory } from "@/lib/labels";
import { rupeesToMinorUnits } from "@/lib/money";
import { VehicleHttpError } from "@/server/vehicles/errors";
import type { VehicleAvailability, VehicleCategory } from "@/types/domain";

export const MAX_PAGE_LIMIT = 50;
export const DEFAULT_PAGE_LIMIT = 12;
export const MAX_SEARCH_LENGTH = 40;

export const VEHICLE_SORTS = [
  "recommended",
  "price",
  "price_asc",
  "price_desc",
  "rating",
  "createdAt",
] as const;

export type VehicleListSort = (typeof VEHICLE_SORTS)[number];

export const ALLOWED_LIST_QUERY_KEYS = new Set([
  "category",
  "minPrice",
  "maxPrice",
  "rating",
  "minRating",
  "availability",
  "search",
  "q",
  "sort",
  "page",
  "limit",
  "location",
  "latitude",
  "longitude",
  "radius",
  "mine",
]);

export type VehicleListQuery = {
  search: string;
  category: VehicleCategory | null;
  minPriceMinor: number | null;
  maxPriceMinor: number | null;
  minRating: number | null;
  availability: VehicleAvailability | null;
  location: string;
  nearby: NearbySearch | null;
  sort: VehicleListSort;
  page: number;
  limit: number;
  mine: boolean;
};

export const DEFAULT_VEHICLE_LIST_QUERY: VehicleListQuery = {
  search: "",
  category: null,
  minPriceMinor: null,
  maxPriceMinor: null,
  minRating: null,
  availability: null,
  location: "",
  nearby: null,
  sort: "recommended",
  page: 1,
  limit: DEFAULT_PAGE_LIMIT,
  mine: false,
};

const FORBIDDEN_KEY = /[$[\]\.]/;
const FORBIDDEN_VALUE = /\$[a-zA-Z]/;

export function rejectUnsafeSearchParams(
  entries: Iterable<[string, string]>,
): void {
  for (const [key, value] of entries) {
    if (!ALLOWED_LIST_QUERY_KEYS.has(key) || FORBIDDEN_KEY.test(key) || FORBIDDEN_VALUE.test(value)) {
      throw new VehicleHttpError(400, "Unsupported query parameter");
    }
  }
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new VehicleHttpError(400, "Invalid numeric query parameter");
  }
  return parsed;
}

export function searchParamsFromRecord(
  params: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw !== undefined && typeof raw === "object" && !Array.isArray(raw)) {
      throw new VehicleHttpError(400, "Unsupported query parameter");
    }
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value !== undefined) {
      searchParams.append(key, value);
    }
  }
  return searchParams;
}

export function parseVehicleListQuery(
  searchParams: URLSearchParams,
): VehicleListQuery {
  rejectUnsafeSearchParams(searchParams.entries());

  const search = (searchParams.get("search") ?? searchParams.get("q") ?? "").trim();
  if (search.length > MAX_SEARCH_LENGTH) {
    throw new VehicleHttpError(400, "Search query is too long");
  }

  const categoryRaw = searchParams.get("category");
  const availabilityRaw = searchParams.get("availability");
  const sortRaw = searchParams.get("sort") ?? "recommended";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const rating = searchParams.get("rating") ?? searchParams.get("minRating");
  const location = (searchParams.get("location") ?? "").trim();
  let nearby = null;
  try {
    nearby = parseNearbySearch({
      latitude: searchParams.get("latitude"),
      longitude: searchParams.get("longitude"),
      radius: searchParams.get("radius"),
    });
  } catch (error) {
    if (error instanceof GeoValidationError) {
      throw new VehicleHttpError(422, error.message, { [error.field]: error.message });
    }
    throw error;
  }
  const page = Math.max(1, readInt(searchParams.get("page"), 1));
  const requestedLimit = readInt(searchParams.get("limit"), DEFAULT_PAGE_LIMIT);
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, requestedLimit));

  if (minPrice && Number(minPrice) < 0) {
    throw new VehicleHttpError(422, "Negative price rejected");
  }
  if (maxPrice && Number(maxPrice) < 0) {
    throw new VehicleHttpError(422, "Negative price rejected");
  }

  const minPriceRupees = minPrice ? Number(minPrice) : Number.NaN;
  const maxPriceRupees = maxPrice ? Number(maxPrice) : Number.NaN;
  const minRating = rating ? Number(rating) : Number.NaN;

  if (
    (minPrice && !Number.isFinite(minPriceRupees)) ||
    (maxPrice && !Number.isFinite(maxPriceRupees)) ||
    (rating && !Number.isFinite(minRating))
  ) {
    throw new VehicleHttpError(400, "Invalid numeric query parameter");
  }

  if (sortRaw && !(VEHICLE_SORTS as readonly string[]).includes(sortRaw)) {
    throw new VehicleHttpError(400, "Unsupported sort field");
  }

  const mineRaw = searchParams.get("mine");
  const mine = mineRaw === "1" || mineRaw === "true";

  return {
    search,
    category:
      categoryRaw && categoryRaw !== "all" && isVehicleCategory(categoryRaw)
        ? categoryRaw
        : null,
    minPriceMinor:
      Number.isFinite(minPriceRupees) && minPriceRupees > 0
        ? rupeesToMinorUnits(minPriceRupees)
        : null,
    maxPriceMinor:
      Number.isFinite(maxPriceRupees) && maxPriceRupees > 0
        ? rupeesToMinorUnits(maxPriceRupees)
        : null,
    minRating: Number.isFinite(minRating) && minRating > 0 ? minRating : null,
    availability:
      availabilityRaw &&
      availabilityRaw !== "all" &&
      isVehicleAvailability(availabilityRaw)
        ? availabilityRaw
        : null,
    location,
    nearby,
    sort: (VEHICLE_SORTS as readonly string[]).includes(sortRaw)
      ? (sortRaw as VehicleListSort)
      : "recommended",
    page,
    limit,
    mine,
  };
}

export function mongoSort(sort: VehicleListSort): Record<string, 1 | -1> {
  switch (sort) {
    case "price":
    case "price_asc":
      return { "pricing.amount": 1 };
    case "price_desc":
      return { "pricing.amount": -1 };
    case "rating":
    case "recommended":
      return { "rating.average": -1, createdAt: -1 };
    case "createdAt":
      return { createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}
