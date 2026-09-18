import { VehicleHttpError } from "@/server/vehicles/errors";

export function assertOwnsVehicle(
  vehicleVendorId: string,
  actorVendorId: string,
): void {
  if (vehicleVendorId !== actorVendorId) {
    throw new VehicleHttpError(403, "Forbidden");
  }
}

export function vendorIdFromAuthenticatedVendor(actorVendorId: string): string {
  return actorVendorId;
}
