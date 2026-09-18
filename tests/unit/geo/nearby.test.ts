import { describe, expect, it } from "vitest";
import { geoNearStage, parseNearbySearch } from "@/lib/geo/nearby";
import { GeoValidationError } from "@/lib/geo/validate";
import { parseVehicleListQuery } from "@/server/vehicles/list-query";
import { VehicleHttpError } from "@/server/vehicles/errors";

describe("nearby search parsing", () => {
  it("parses a valid nearby query with a default radius", () => {
    const nearby = parseNearbySearch({
      latitude: "18.5204",
      longitude: "73.8567",
      radius: null,
    });
    expect(nearby).toEqual({
      latitude: 18.5204,
      longitude: 73.8567,
      radiusMeters: 10_000,
    });
  });

  it("rejects invalid, negative, and excessive radii", () => {
    expect(() =>
      parseNearbySearch({ latitude: "18", longitude: "73", radius: "-1" }),
    ).toThrow(GeoValidationError);
    expect(() =>
      parseNearbySearch({ latitude: "18", longitude: "73", radius: "9999999" }),
    ).toThrow(GeoValidationError);
    expect(() =>
      parseNearbySearch({ latitude: "18", longitude: "73", radius: "12.5" }),
    ).toThrow(GeoValidationError);
  });

  it("builds a $geoNear stage without leaking client operators", () => {
    const stage = geoNearStage(
      { latitude: 18.52, longitude: 73.85, radiusMeters: 5000 },
      { status: "active" },
    );
    expect(stage.$geoNear.key).toBe("location.point");
    expect(stage.$geoNear.near.coordinates).toEqual([73.85, 18.52]);
    expect(stage.$geoNear.maxDistance).toBe(5000);
    expect(JSON.stringify(stage)).not.toContain("$where");
  });

  it("maps nearby query params through the vehicle list parser", () => {
    const query = parseVehicleListQuery(
      new URLSearchParams("latitude=18.52&longitude=73.85&radius=25000&category=car"),
    );
    expect(query.nearby).toEqual({
      latitude: 18.52,
      longitude: 73.85,
      radiusMeters: 25000,
    });
    expect(query.category).toBe("car");
  });

  it("rejects Mongo operators in nearby query keys", () => {
    expect(() =>
      parseVehicleListQuery(new URLSearchParams("latitude[$gt]=1&longitude=73")),
    ).toThrow(VehicleHttpError);
  });
});
