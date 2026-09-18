import { describe, expect, it } from "vitest";
import { parseVehicleFormInput } from "@/lib/validation/vehicle-form";

describe("vendor vehicle form validation", () => {
  it("accepts a complete listing payload", () => {
    const result = parseVehicleFormInput({
      category: "car",
      brand: "Toyota",
      model: "Etios",
      registrationNumber: "mh12zz9999",
      priceRupees: "1500",
      description: "City sedan",
      images: "",
      location: {
        address: "Pune Airport",
        city: "Pune",
        latitude: 18.5793,
        longitude: 73.9089,
      },
      availability: "available",
    });
    expect(result.data?.registrationNumber).toBe("MH12ZZ9999");
    expect(result.data?.priceRupees).toBe(1500);
    expect(result.fields).toBeUndefined();
  });

  it("requires core fields and a whole-rupee price", () => {
    const result = parseVehicleFormInput({
      category: "spaceship",
      brand: "",
      model: "",
      registrationNumber: "",
      priceRupees: "12.5",
      location: "",
      availability: "soon",
    });
    expect(result.data).toBeUndefined();
    expect(result.fields?.category).toBeDefined();
    expect(result.fields?.brand).toBeDefined();
    expect(result.fields?.model).toBeDefined();
    expect(result.fields?.registrationNumber).toBeDefined();
    expect(result.fields?.priceRupees).toBeDefined();
    expect(result.fields?.location).toBeDefined();
    expect(result.fields?.availability).toBeDefined();
  });
});
