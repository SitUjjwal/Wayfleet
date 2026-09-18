import { EmptyState } from "@/components/feedback/empty-state";
import { VehicleCard } from "@/components/marketplace/vehicle-card";
import type { CatalogVehicle } from "@/features/vehicles/types";

export function VehicleGrid({ vehicles }: { vehicles: CatalogVehicle[] }) {
  if (vehicles.length === 0) {
    return (
      <EmptyState
        title="No vehicles found."
        description="Try another city, category, or price range."
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {vehicles.map((vehicle) => (
        <li key={vehicle.id}>
          <VehicleCard vehicle={vehicle} />
        </li>
      ))}
    </ul>
  );
}
