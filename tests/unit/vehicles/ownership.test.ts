import { describe, expect, it } from "vitest";
import { assertOwnsVehicle, vendorIdFromAuthenticatedVendor } from "@/server/vehicles/ownership";
import { expectVehicleHttpError } from "./helpers";

describe("vendor ownership", () => {
  it("allows the owning vendor and rejects another vendor", () => {
    expect(() => assertOwnsVehicle("vendor-a", "vendor-a")).not.toThrow();
    expectVehicleHttpError(() => assertOwnsVehicle("vendor-a", "vendor-b"), 403, "Forbidden");
  });

  it("uses only the authenticated vendor id", () => {
    expect(vendorIdFromAuthenticatedVendor("session-vendor")).toBe("session-vendor");
  });
});
