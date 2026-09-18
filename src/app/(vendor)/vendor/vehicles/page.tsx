import { getCurrentUser } from "@/server/auth/guards";
import { VendorVehicleManager } from "@/components/vehicle/vendor-vehicle-manager";
import type { ManagedVehicle } from "@/features/vehicles/types";
import { toManagedCatalog } from "@/server/vehicles/dto";
import { VehicleHttpError } from "@/server/vehicles/errors";
import { DEFAULT_VEHICLE_LIST_QUERY } from "@/server/vehicles/list-query";
import { listVendorVehicles } from "@/server/vehicles/service";

export const dynamic = "force-dynamic";

export default async function VendorVehiclesPage() {
  const user = await getCurrentUser();
  let initialVehicles: ManagedVehicle[] = [];
  let initialError: string | undefined;

  if (!user) {
    initialError = "Unauthenticated";
  } else {
    try {
      const result = await listVendorVehicles(user, {
        ...DEFAULT_VEHICLE_LIST_QUERY,
        sort: "createdAt",
        limit: 50,
        mine: true,
      });
      initialVehicles = result.data.map(toManagedCatalog);
    } catch (error) {
      initialError =
        error instanceof VehicleHttpError
          ? error.message
          : "Could not load vehicles";
    }
  }

  return (
    <VendorVehicleManager
      initialVehicles={initialVehicles}
      initialError={initialError}
    />
  );
}
