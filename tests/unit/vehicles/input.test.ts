import { describe, expect, it } from "vitest";
import { parseVehicleCreateBody, parseVehiclePatchBody } from "@/server/vehicles/input";
import { expectVehicleHttpError, validCreateBody } from "./helpers";

describe("vehicle write validation", () => {
  it("accepts a valid create payload", () => {
    const parsed = parseVehicleCreateBody(validCreateBody());
    expect(parsed.registrationNumber).toBe("MH12ZZ9999");
    expect(parsed.pricing.amount).toBe(150000);
    expect(parsed.pricing.currency).toBe("INR");
    expect(parsed.location.city).toBe("Pune");
  });

  it("rejects missing fields, invalid category, and negative price", () => {
    expectVehicleHttpError(() => parseVehicleCreateBody({}), 422);
    expectVehicleHttpError(
      () => parseVehicleCreateBody(validCreateBody({ category: "spaceship" })),
      422,
    );
    expectVehicleHttpError(
      () => parseVehicleCreateBody(validCreateBody({ priceRupees: -5 })),
      422,
    );
  });

  it("rejects malformed location", () => {
    expectVehicleHttpError(
      () => parseVehicleCreateBody(validCreateBody({ location: {} })),
      422,
    );
    expectVehicleHttpError(
      () => parseVehicleCreateBody(validCreateBody({ location: ["Pune"] })),
      422,
    );
    expectVehicleHttpError(
      () => parseVehicleCreateBody(validCreateBody({ location: "Pune" })),
      422,
    );
    expectVehicleHttpError(
      () =>
        parseVehicleCreateBody(
          validCreateBody({
            location: { address: "Pune", latitude: 200, longitude: 73 },
          }),
        ),
      422,
    );
    expectVehicleHttpError(
      () =>
        parseVehicleCreateBody(
          validCreateBody({
            location: { $near: { $geometry: { type: "Point", coordinates: [73, 18] } } },
          }),
        ),
      422,
    );
  });

  it("rejects client vendorId and rating overrides", () => {
    expectVehicleHttpError(
      () => parseVehicleCreateBody(validCreateBody({ vendorId: "507f1f77bcf86cd799439011" })),
      422,
      "Unauthorized field cannot be modified",
    );
    expectVehicleHttpError(
      () =>
        parseVehiclePatchBody({
          availability: "available",
          vendorId: "507f1f77bcf86cd799439012",
        }),
      422,
      "Unauthorized field cannot be modified",
    );
    expectVehicleHttpError(
      () => parseVehiclePatchBody({ rating: { average: 5, count: 99 } }),
      422,
      "Unauthorized field cannot be modified",
    );
  });

  it("allows an availability-only patch", () => {
    const patch = parseVehiclePatchBody({ availability: "unavailable" });
    expect(patch).toEqual({ availability: "unavailable" });
  });
});
