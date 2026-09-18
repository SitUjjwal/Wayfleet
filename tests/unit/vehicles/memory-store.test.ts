import { describe, expect, it } from "vitest";
import { parseVehicleCreateBody, parseVehiclePatchBody } from "@/server/vehicles/input";
import { assertOwnsVehicle } from "@/server/vehicles/ownership";
import { VehicleHttpError } from "@/server/vehicles/errors";
import { validCreateBody } from "./helpers";

type StoredVehicle = {
  id: string;
  vendorId: string;
  registrationNumber: string;
  status: "active" | "inactive" | "draft" | "blocked";
  brand: string;
  availability: string;
  pricing: { amount: number; currency: string; unit: "day" };
};

class MemoryVehicleStore {
  vehicles: StoredVehicle[] = [];

  create(actorVendorId: string, body: unknown): StoredVehicle {
    const input = parseVehicleCreateBody(body);
    if (this.vehicles.some((vehicle) => vehicle.registrationNumber === input.registrationNumber)) {
      throw new VehicleHttpError(409, "Duplicate vehicle registration");
    }
    const created: StoredVehicle = {
      id: `veh-${this.vehicles.length + 1}`,
      vendorId: actorVendorId,
      registrationNumber: input.registrationNumber,
      status: "active",
      brand: input.brand,
      availability: input.availability,
      pricing: input.pricing,
    };
    this.vehicles.push(created);
    return created;
  }

  update(actorVendorId: string, id: string, body: unknown): StoredVehicle {
    const vehicle = this.vehicles.find((item) => item.id === id);
    if (!vehicle) {
      throw new VehicleHttpError(404, "Vehicle not found");
    }
    assertOwnsVehicle(vehicle.vendorId, actorVendorId);
    const patch = parseVehiclePatchBody(body);
    if (patch.brand) {
      vehicle.brand = patch.brand;
    }
    if (patch.availability) {
      vehicle.availability = patch.availability;
    }
    if (patch.registrationNumber) {
      vehicle.registrationNumber = patch.registrationNumber;
    }
    return vehicle;
  }

  inactivate(actorVendorId: string, id: string): StoredVehicle {
    const vehicle = this.vehicles.find((item) => item.id === id);
    if (!vehicle) {
      throw new VehicleHttpError(404, "Vehicle not found");
    }
    assertOwnsVehicle(vehicle.vendorId, actorVendorId);
    vehicle.status = "inactive";
    return vehicle;
  }
}

describe("in-memory vehicle store", () => {
  it("creates a vehicle owned by the authenticated vendor", () => {
    const store = new MemoryVehicleStore();
    const created = store.create("vendor-a", validCreateBody());
    expect(created.vendorId).toBe("vendor-a");
    expect(created.status).toBe("active");
    expect(created.registrationNumber).toBe("MH12ZZ9999");
  });

  it("rejects a duplicate registration number", () => {
    const store = new MemoryVehicleStore();
    store.create("vendor-a", validCreateBody());
    expect(() => store.create("vendor-b", validCreateBody())).toThrow(VehicleHttpError);
    try {
      store.create("vendor-b", validCreateBody({ registrationNumber: "MH12ZZ9999" }));
    } catch (error) {
      expect((error as VehicleHttpError).status).toBe(409);
    }
  });

  it("prevents another vendor from updating or inactivating a listing", () => {
    const store = new MemoryVehicleStore();
    const created = store.create("vendor-a", validCreateBody());
    try {
      store.update("vendor-b", created.id, { brand: "Stolen" });
      throw new Error("expected throw");
    } catch (error) {
      expect((error as VehicleHttpError).status).toBe(403);
    }
    try {
      store.inactivate("vendor-b", created.id);
      throw new Error("expected throw");
    } catch (error) {
      expect((error as VehicleHttpError).status).toBe(403);
    }
    expect(store.vehicles[0]?.brand).toBe("Toyota");
    expect(store.vehicles[0]?.status).toBe("active");
  });

  it("lets the owner update and inactivate their listing", () => {
    const store = new MemoryVehicleStore();
    const created = store.create("vendor-a", validCreateBody());
    store.update("vendor-a", created.id, { availability: "maintenance" });
    store.inactivate("vendor-a", created.id);
    expect(store.vehicles[0]?.availability).toBe("maintenance");
    expect(store.vehicles[0]?.status).toBe("inactive");
  });
});
