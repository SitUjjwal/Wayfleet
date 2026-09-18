import { describe, expect, it } from "vitest";
import { DEFAULT_VEHICLE_LIST_QUERY } from "@/server/vehicles/list-query";
import { buildVehicleListFilter } from "@/server/vehicles/query-builder";

describe("vehicle mongo filter builder", () => {
  it("builds a controlled public filter without copying unknown fields", () => {
    const filter = buildVehicleListFilter(
      {
        ...DEFAULT_VEHICLE_LIST_QUERY,
        category: "car",
        minPriceMinor: 50000,
        maxPriceMinor: 300000,
        search: "Inno.*va",
        location: "Pune",
      },
      { publicOnly: true },
    );
    expect(filter.status).toBe("active");
    expect(filter.category).toBe("car");
    expect(filter["pricing.amount"]).toEqual({ $gte: 50000, $lte: 300000 });
    const clauses = filter.$or as Array<{ brand?: { $regex: string } }>;
    expect(clauses[0]?.brand?.$regex).toBe("Inno\\.\\*va");
    expect(filter).not.toHaveProperty("$where");
    expect(filter).not.toHaveProperty("vendor.contact");
  });

  it("scopes vendor management lists to the authenticated vendor", () => {
    const filter = buildVehicleListFilter(DEFAULT_VEHICLE_LIST_QUERY, {
      publicOnly: false,
      vendorId: "vendor-1",
    });
    expect(filter.vendor).toBe("vendor-1");
    expect(filter.status).toBeUndefined();
  });
});
