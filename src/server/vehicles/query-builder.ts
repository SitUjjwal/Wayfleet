import { isVehicleCategory } from "@/lib/labels";
import {
  escapeRegex,
  type VehicleListQuery,
} from "@/server/vehicles/list-query";

export function buildVehicleListFilter(
  query: VehicleListQuery,
  options: { vendorId?: string; publicOnly: boolean },
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (options.publicOnly) {
    filter.status = "active";
  }
  if (options.vendorId) {
    filter.vendor = options.vendorId;
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (query.availability) {
    filter.availability = query.availability;
  }
  if (query.minPriceMinor !== null || query.maxPriceMinor !== null) {
    const amount: Record<string, number> = {};
    if (query.minPriceMinor !== null) {
      amount.$gte = query.minPriceMinor;
    }
    if (query.maxPriceMinor !== null) {
      amount.$lte = query.maxPriceMinor;
    }
    filter["pricing.amount"] = amount;
  }
  if (query.minRating !== null) {
    filter["rating.average"] = { $gte: query.minRating };
  }
  if (query.location) {
    const escaped = escapeRegex(query.location);
    filter["location.city"] = { $regex: `^${escaped}`, $options: "i" };
  }
  if (query.search) {
    const escaped = escapeRegex(query.search);
    const searchOr: Record<string, unknown>[] = [
      { brand: { $regex: escaped, $options: "i" } },
      { model: { $regex: escaped, $options: "i" } },
    ];
    const categoryMatch = query.search.toLowerCase().replace(/\s+/g, "_");
    if (isVehicleCategory(categoryMatch)) {
      searchOr.push({ category: categoryMatch });
    }
    filter.$or = searchOr;
  }

  return filter;
}
