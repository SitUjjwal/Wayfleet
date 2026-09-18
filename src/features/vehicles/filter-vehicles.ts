import type { CatalogVehicle } from "@/features/vehicles/types";
import type { VehicleAvailability, VehicleCategory } from "@/types/domain";
import { isVehicleAvailability, isVehicleCategory } from "@/lib/labels";

export type VehicleSort = "recommended" | "price_asc" | "price_desc" | "rating";

export type VehicleFilterState = {
  query: string;
  category: VehicleCategory | "all";
  minPriceRupees: number | null;
  maxPriceRupees: number | null;
  minRating: number | null;
  availability: VehicleAvailability | "all";
  location: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  sort: VehicleSort;
  page: number;
};

export const DEFAULT_VEHICLE_FILTERS: VehicleFilterState = {
  query: "",
  category: "all",
  minPriceRupees: null,
  maxPriceRupees: null,
  minRating: null,
  availability: "all",
  location: "",
  latitude: null,
  longitude: null,
  radiusMeters: null,
  sort: "recommended",
  page: 1,
};

function parseOptionalNumber(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseVehicleFilters(
  params: Record<string, string | string[] | undefined>,
): VehicleFilterState {
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const category = read("category") ?? "all";
  const availability = read("availability") ?? "all";
  const sort = read("sort") ?? "recommended";
  const minPrice = Number(read("minPrice") ?? "");
  const maxPrice = Number(read("maxPrice") ?? "");
  const minRating = Number(read("minRating") ?? read("rating") ?? "");
  const page = Number(read("page") ?? "1");

  return {
    query: (read("q") ?? read("search") ?? "").trim(),
    category: isVehicleCategory(category) ? category : "all",
    minPriceRupees: Number.isFinite(minPrice) && minPrice > 0 ? minPrice : null,
    maxPriceRupees: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : null,
    minRating: Number.isFinite(minRating) && minRating > 0 ? minRating : null,
    availability: isVehicleAvailability(availability) ? availability : "all",
    location: (read("location") ?? "").trim(),
    latitude: parseOptionalNumber(read("latitude")),
    longitude: parseOptionalNumber(read("longitude")),
    radiusMeters: parseOptionalNumber(read("radius")),
    sort:
      sort === "price_asc" || sort === "price_desc" || sort === "rating"
        ? sort
        : "recommended",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function vehicleFiltersToSearchParams(filters: VehicleFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) {
    params.set("q", filters.query);
  }
  if (filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters.minPriceRupees !== null) {
    params.set("minPrice", String(filters.minPriceRupees));
  }
  if (filters.maxPriceRupees !== null) {
    params.set("maxPrice", String(filters.maxPriceRupees));
  }
  if (filters.minRating !== null) {
    params.set("minRating", String(filters.minRating));
  }
  if (filters.availability !== "all") {
    params.set("availability", filters.availability);
  }
  if (filters.location) {
    params.set("location", filters.location);
  }
  if (filters.latitude !== null && filters.longitude !== null) {
    params.set("latitude", String(filters.latitude));
    params.set("longitude", String(filters.longitude));
    if (filters.radiusMeters !== null) {
      params.set("radius", String(filters.radiusMeters));
    }
  }
  if (filters.sort !== "recommended") {
    params.set("sort", filters.sort);
  }
  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }
  return params;
}

export function filterVehicles(
  vehicles: CatalogVehicle[],
  filters: VehicleFilterState,
): CatalogVehicle[] {
  const query = filters.query.toLowerCase();
  const location = filters.location.toLowerCase();

  const filtered = vehicles.filter((vehicle) => {
    if (filters.category !== "all" && vehicle.category !== filters.category) {
      return false;
    }
    if (
      filters.availability !== "all" &&
      vehicle.availability !== filters.availability
    ) {
      return false;
    }
    if (query) {
      const haystack = [
        vehicle.brand,
        vehicle.model,
        vehicle.vendorName,
        vehicle.location.city ?? "",
        vehicle.category,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    if (
      location &&
      !(vehicle.location.city ?? vehicle.location.label).toLowerCase().includes(location)
    ) {
      return false;
    }
    const rupees = vehicle.pricing.amount / 100;
    if (filters.minPriceRupees !== null && rupees < filters.minPriceRupees) {
      return false;
    }
    if (filters.maxPriceRupees !== null && rupees > filters.maxPriceRupees) {
      return false;
    }
    if (filters.minRating !== null && vehicle.rating.average < filters.minRating) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === "price_asc") {
      return a.pricing.amount - b.pricing.amount;
    }
    if (filters.sort === "price_desc") {
      return b.pricing.amount - a.pricing.amount;
    }
    if (filters.sort === "rating") {
      return b.rating.average - a.rating.average;
    }
    if (a.vendorVerified !== b.vendorVerified) {
      return a.vendorVerified ? -1 : 1;
    }
    if (a.availability !== b.availability) {
      return a.availability === "available" ? -1 : 1;
    }
    return b.rating.average - a.rating.average;
  });
}
