import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { TripPositionModel } from "@/models/trip-position";
import { validationError } from "../models/validate";

function validPosition() {
  return {
    booking: new mongoose.Types.ObjectId(),
    vehicle: new mongoose.Types.ObjectId(),
    vendor: new mongoose.Types.ObjectId(),
    point: { type: "Point" as const, coordinates: [73.8567, 18.5204] as [number, number] },
    latitude: 18.5204,
    longitude: 73.8567,
    recordedAt: new Date(),
    source: "geolocation" as const,
    expiresAt: new Date(Date.now() + 86_400_000),
  };
}

describe("TripPosition model", () => {
  it("accepts a GeoJSON Point with [longitude, latitude]", async () => {
    const doc = new TripPositionModel(validPosition());
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.point.coordinates[0]).toBe(73.8567);
    expect(doc.point.coordinates[1]).toBe(18.5204);
    expect(TripPositionModel.schema.path("booking").options.ref).toBe("Booking");
    expect(TripPositionModel.schema.path("vehicle").options.ref).toBe("Vehicle");
    expect(TripPositionModel.schema.path("vendor").options.ref).toBe("Vendor");
  });

  it("defines unique booking, TTL, and 2dsphere indexes", () => {
    expect(TripPositionModel.schema.path("booking").options.unique).toBe(true);
    const indexes = TripPositionModel.schema.indexes();
    expect(indexes.some((entry) => entry[0].expiresAt === 1)).toBe(true);
    expect(
      indexes.some(
        (entry) =>
          entry[0].point === "2dsphere" || JSON.stringify(entry[0]).includes("2dsphere"),
      ),
    ).toBe(true);
  });

  it("rejects invalid coordinates and missing booking references", async () => {
    const missing = await validationError(new TripPositionModel({}));
    expect(missing?.errors.booking).toBeDefined();
    expect(missing?.errors.vehicle).toBeDefined();
    expect(missing?.errors.vendor).toBeDefined();

    const invalid = await validationError(
      new TripPositionModel({
        ...validPosition(),
        latitude: 200,
        point: { type: "LineString", coordinates: [73, 18] },
      }),
    );
    expect(invalid?.errors.latitude).toBeDefined();
  });
});
