import { expect } from "vitest";
import { VehicleHttpError } from "@/server/vehicles/errors";

export function expectVehicleHttpError(run: () => unknown, status: number, message?: string) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(VehicleHttpError);
    const httpError = error as VehicleHttpError;
    expect(httpError.status).toBe(status);
    if (message) {
      expect(httpError.message).toBe(message);
    }
    return httpError;
  }
  throw new Error(`Expected VehicleHttpError ${status}`);
}

export function validCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    category: "car",
    brand: "Toyota",
    model: "Etios",
    registrationNumber: "MH12ZZ9999",
    priceRupees: 1500,
    description: "City sedan",
    images: [],
    location: {
      address: "Pune Airport",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      latitude: 18.5793,
      longitude: 73.9089,
    },
    availability: "available",
    ...overrides,
  };
}
