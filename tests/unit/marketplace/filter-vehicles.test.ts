import { describe, expect, it } from "vitest";
import {
  DEMO_VEHICLES,
  getBrowsableDemoVehicles,
} from "@/features/vehicles/data/mock-vehicles";
import {
  DEFAULT_VEHICLE_FILTERS,
  filterVehicles,
  parseVehicleFilters,
} from "@/features/vehicles/filter-vehicles";

describe("vehicle filtering", () => {
  it("hides draft listings from the public catalog", () => {
    expect(DEMO_VEHICLES.some((vehicle) => vehicle.status === "draft")).toBe(true);
    expect(
      getBrowsableDemoVehicles().every((vehicle) => vehicle.status === "active"),
    ).toBe(true);
  });

  it("filters by keyword, category, and availability", () => {
    const result = filterVehicles(getBrowsableDemoVehicles(), {
      ...DEFAULT_VEHICLE_FILTERS,
      query: "innova",
      category: "suv",
      availability: "available",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("demo-innova-pune");
  });

  it("sorts by price low to high", () => {
    const result = filterVehicles(getBrowsableDemoVehicles(), {
      ...DEFAULT_VEHICLE_FILTERS,
      sort: "price_asc",
    });
    const prices = result.map((vehicle) => vehicle.pricing.amount);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("returns an empty list when nothing matches", () => {
    const result = filterVehicles(getBrowsableDemoVehicles(), {
      ...DEFAULT_VEHICLE_FILTERS,
      location: "Chennai",
    });
    expect(result).toHaveLength(0);
  });

  it("parses filter query params without treating them as database input", () => {
    const filters = parseVehicleFilters({
      q: "Scorpio",
      category: "suv",
      sort: "rating",
      minPrice: "1000",
    });
    expect(filters.query).toBe("Scorpio");
    expect(filters.category).toBe("suv");
    expect(filters.sort).toBe("rating");
    expect(filters.minPriceRupees).toBe(1000);
  });
});
