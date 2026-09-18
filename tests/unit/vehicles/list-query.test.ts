import { describe, expect, it } from "vitest";
import { VehicleHttpError } from "@/server/vehicles/errors";
import {
  escapeRegex,
  MAX_PAGE_LIMIT,
  parseVehicleListQuery,
  searchParamsFromRecord,
} from "@/server/vehicles/list-query";
import { expectVehicleHttpError } from "./helpers";

describe("vehicle list query parsing", () => {
  it("parses supported filters and clamps pagination", () => {
    const query = parseVehicleListQuery(
      new URLSearchParams(
        "category=car&minPrice=500&maxPrice=3000&search=Innova&sort=price_asc&page=2&limit=999&availability=available&rating=4",
      ),
    );
    expect(query.category).toBe("car");
    expect(query.minPriceMinor).toBe(50000);
    expect(query.maxPriceMinor).toBe(300000);
    expect(query.search).toBe("Innova");
    expect(query.sort).toBe("price_asc");
    expect(query.page).toBe(2);
    expect(query.limit).toBe(MAX_PAGE_LIMIT);
    expect(query.minRating).toBe(4);
    expect(query.availability).toBe("available");
  });

  it("accepts q as a search alias", () => {
    const query = parseVehicleListQuery(new URLSearchParams("q=Scorpio"));
    expect(query.search).toBe("Scorpio");
  });

  it("rejects unsupported MongoDB operators and unknown fields", () => {
    expectVehicleHttpError(
      () => parseVehicleListQuery(new URLSearchParams("category[$gt]=car")),
      400,
      "Unsupported query parameter",
    );
    expectVehicleHttpError(
      () => parseVehicleListQuery(new URLSearchParams("$where=true")),
      400,
    );
    expectVehicleHttpError(
      () => parseVehicleListQuery(new URLSearchParams("vendor.contact=x")),
      400,
    );
    expectVehicleHttpError(
      () => parseVehicleListQuery(new URLSearchParams("status[$ne]=inactive")),
      400,
    );
    expectVehicleHttpError(
      () => parseVehicleListQuery(new URLSearchParams("search=$ne")),
      400,
    );
  });

  it("rejects nested search param objects", () => {
    try {
      searchParamsFromRecord({
        category: { $gt: "car" } as unknown as string,
      });
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(VehicleHttpError);
      expect((error as VehicleHttpError).status).toBe(400);
    }
  });

  it("rejects arbitrary sort fields", () => {
    expectVehicleHttpError(
      () => parseVehicleListQuery(new URLSearchParams("sort=passwordHash")),
      400,
      "Unsupported sort field",
    );
    expectVehicleHttpError(
      () => parseVehicleListQuery(new URLSearchParams("sort=vendor.contact")),
      400,
    );
  });

  it("rejects negative prices in filters", () => {
    expectVehicleHttpError(
      () => parseVehicleListQuery(new URLSearchParams("minPrice=-10")),
      422,
      "Negative price rejected",
    );
  });

  it("escapes regex metacharacters", () => {
    expect(escapeRegex("Inno.*va")).toBe("Inno\\.\\*va");
  });
});
