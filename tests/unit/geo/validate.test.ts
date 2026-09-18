import { describe, expect, it } from "vitest";
import {
  generalizePublicLocation,
  GeoValidationError,
  hasMongoOperatorKeys,
  parseGeoPoint,
  parseLatitude,
  parseLocationInput,
  parseLongitude,
  toStoredLocation,
} from "@/lib/geo/validate";

describe("geo validation", () => {
  it("rejects invalid, out-of-range, NaN, and infinite coordinates", () => {
    expect(() => parseLatitude(91)).toThrow(GeoValidationError);
    expect(() => parseLatitude(-91)).toThrow(GeoValidationError);
    expect(() => parseLongitude(181)).toThrow(GeoValidationError);
    expect(() => parseLongitude(-181)).toThrow(GeoValidationError);
    expect(() => parseLatitude(Number.NaN)).toThrow(GeoValidationError);
    expect(() => parseLongitude(Number.POSITIVE_INFINITY)).toThrow(GeoValidationError);
  });

  it("accepts a valid location and stores GeoJSON as [longitude, latitude]", () => {
    const input = parseLocationInput({
      address: "Pune Airport",
      city: "Pune",
      latitude: 18.5793,
      longitude: 73.9089,
    });
    const stored = toStoredLocation(input);
    expect(stored.point).toEqual({
      type: "Point",
      coordinates: [73.9089, 18.5793],
    });
    expect(stored.label).toBe("Pune Airport");
  });

  it("rejects wrong GeoJSON types, malformed coordinates, and operators", () => {
    expect(() => parseGeoPoint({ type: "Polygon", coordinates: [73, 18] })).toThrow(
      /Point/,
    );
    expect(() => parseGeoPoint({ type: "Point", coordinates: [73] })).toThrow(
      /coordinates/,
    );
    expect(hasMongoOperatorKeys({ $near: true })).toBe(true);
    expect(() =>
      parseLocationInput({ $near: { $geometry: { type: "Point" } } }),
    ).toThrow(GeoValidationError);
  });

  it("detects reversed GeoJSON when labeled lat/lng are also sent", () => {
    expect(() =>
      parseLocationInput({
        address: "Pune",
        latitude: 18.5793,
        longitude: 73.9089,
        point: { type: "Point", coordinates: [18.5793, 73.9089] },
      }),
    ).toThrow(/longitude, latitude/);
  });

  it("generalizes public coordinates and city labels", () => {
    const publicLocation = generalizePublicLocation({
      label: "12 Private Lane",
      city: "Pune",
      lat: 18.57934,
      lng: 73.90891,
    });
    expect(publicLocation.label).toBe("Pune");
    expect(publicLocation.latitude).toBe(18.58);
    expect(publicLocation.longitude).toBe(73.91);
  });
});
