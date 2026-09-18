import { describe, expect, it } from "vitest";
import {
  publicPayloadContainsPrivateFields,
  toCatalogVehicle,
  type PublicVehicle,
} from "@/server/vehicles/dto";

const publicVehicle: PublicVehicle = {
  id: "507f1f77bcf86cd799439011",
  category: "car",
  brand: "Toyota",
  model: "Etios",
  description: "City sedan",
  images: [],
  pricing: { amount: 150000, currency: "INR", unit: "day" },
  location: { label: "Pune", city: "Pune" },
  availability: "available",
  rating: { average: 0, count: 0 },
  vendor: {
    id: "507f1f77bcf86cd799439012",
    businessName: "Harbor Fleet",
    verificationStatus: "verified",
    rating: { average: 4.6, count: 12 },
  },
  createdAt: "2026-09-08T00:00:00.000Z",
};

describe("public vehicle DTO", () => {
  it("omits registration, contact, KYC, and credentials", () => {
    expect(publicPayloadContainsPrivateFields(publicVehicle)).toBe(false);
    expect(JSON.stringify(publicVehicle)).not.toContain("registrationNumber");
    expect(JSON.stringify(publicVehicle)).not.toContain("passwordHash");
    expect(JSON.stringify(publicVehicle)).not.toContain("kycStatus");
    expect(JSON.stringify(publicVehicle)).not.toContain("contact");
  });

  it("maps useful vendor summary fields for the catalog", () => {
    const catalog = toCatalogVehicle(publicVehicle);
    expect(catalog.vendorName).toBe("Harbor Fleet");
    expect(catalog.vendorVerified).toBe(true);
    expect(catalog).not.toHaveProperty("registrationNumber");
  });
});
