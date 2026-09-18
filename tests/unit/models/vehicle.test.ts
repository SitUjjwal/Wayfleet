import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { VehicleModel } from "@/models/vehicle";
import { validationError } from "./validate";

function validVehicle() {
  return {
    vendor: new mongoose.Types.ObjectId(),
    category: "car" as const,
    brand: "Toyota",
    model: "Innova",
    registrationNumber: "MH12AB1234",
    pricing: { amount: 250000, currency: "INR", unit: "day" as const },
    location: { label: "Pune Airport", city: "Pune" },
  };
}

describe("Vehicle model", () => {
  it("accepts a valid vehicle and defaults status fields", async () => {
    const vehicle = new VehicleModel(validVehicle());
    await expect(vehicle.validate()).resolves.toBeUndefined();
    expect(vehicle.status).toBe("draft");
    expect(vehicle.availability).toBe("unavailable");
    expect(vehicle.description).toBe("");
    expect(vehicle.rating.average).toBe(0);
    expect(VehicleModel.schema.path("vendor").options.ref).toBe("Vendor");
  });

  it("defines marketplace indexes including unique registration numbers", () => {
    expect(VehicleModel.schema.path("registrationNumber").options.unique).toBe(true);
    const indexes = VehicleModel.schema.indexes();
    const keys = indexes.map((entry) => JSON.stringify(entry[0]));
    expect(keys.some((key) => key.includes("category") && key.includes("status"))).toBe(
      true,
    );
    expect(keys.some((key) => key.includes("brand") && key.includes("model"))).toBe(true);
    expect(keys.some((key) => key.includes("pricing.amount"))).toBe(true);
    expect(keys.some((key) => key.includes("rating.average"))).toBe(true);
    expect(keys.some((key) => key.includes("location.point"))).toBe(true);
    expect(
      indexes.some(
        (entry) =>
          entry[0]["location.point"] === "2dsphere" ||
          JSON.stringify(entry[0]).includes("2dsphere"),
      ),
    ).toBe(true);
  });

  it("accepts a GeoJSON Point on the existing location subdocument", async () => {
    const vehicle = new VehicleModel({
      ...validVehicle(),
      location: {
        label: "Pune Airport",
        city: "Pune",
        lat: 18.5793,
        lng: 73.9089,
        point: { type: "Point", coordinates: [73.9089, 18.5793] },
      },
    });
    await expect(vehicle.validate()).resolves.toBeUndefined();
  });

  it("requires vendor, category, brand, model, registration, pricing, and location", async () => {
    const error = await validationError(new VehicleModel({}));
    expect(error?.errors.vendor).toBeDefined();
    expect(error?.errors.category).toBeDefined();
    expect(error?.errors.brand).toBeDefined();
    expect(error?.errors.model).toBeDefined();
    expect(error?.errors.registrationNumber).toBeDefined();
    expect(error?.errors.pricing).toBeDefined();
    expect(error?.errors.location).toBeDefined();
  });

  it("rejects invalid category, fractional pricing, and coordinates", async () => {
    const error = await validationError(
      new VehicleModel({
        ...validVehicle(),
        category: "spaceship",
        pricing: { amount: 10.5, currency: "INR", unit: "day" },
        location: { label: "Pune", lat: 200, lng: 0 },
      }),
    );
    expect(error?.errors.category).toBeDefined();
    expect(error?.errors["pricing.amount"]).toBeDefined();
    expect(error?.errors["location.lat"]).toBeDefined();
  });
});
