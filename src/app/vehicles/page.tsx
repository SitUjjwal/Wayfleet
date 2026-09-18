import { ErrorState } from "@/components/feedback/error-state";
import { VehicleFilters } from "@/components/marketplace/vehicle-filters";
import { VehicleGrid } from "@/components/marketplace/vehicle-grid";
import { VehiclePagination } from "@/components/marketplace/vehicle-pagination";
import {
  parseVehicleFilters,
  type VehicleFilterState,
} from "@/features/vehicles/filter-vehicles";
import { toCatalogVehicle } from "@/server/vehicles/dto";
import { VehicleHttpError } from "@/server/vehicles/errors";
import {
  parseVehicleListQuery,
  searchParamsFromRecord,
} from "@/server/vehicles/list-query";
import { listPublicVehicles } from "@/server/vehicles/service";

type VehiclesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse fleet — Wayfleet",
};

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
  const raw = await searchParams;
  const filters = parseVehicleFilters(raw);

  let catalog: {
    vehicles: ReturnType<typeof toCatalogVehicle>[];
    total: number;
    totalPages: number;
    page: number;
    error?: string;
  };

  try {
    const query = parseVehicleListQuery(searchParamsFromRecord(raw));
    query.mine = false;
    const result = await listPublicVehicles(query);
    catalog = {
      vehicles: result.data.map(toCatalogVehicle),
      total: result.pagination.total,
      totalPages: result.pagination.totalPages,
      page: result.pagination.page,
    };
  } catch (error) {
    catalog = {
      vehicles: [],
      total: 0,
      totalPages: 0,
      page: filters.page,
      error:
        error instanceof VehicleHttpError
          ? error.message
          : "Could not load vehicles",
    };
  }

  const displayFilters: VehicleFilterState = { ...filters, page: catalog.page };

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-copper">
          Marketplace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy">
          Find a vehicle
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Browse cars, SUVs, motorcycles, autos, e-rickshaws, buses, trains,
          airplanes, and more.
        </p>
      </div>
      <VehicleFilters filters={displayFilters} />
      {catalog.error ? (
        <ErrorState title="Could not load vehicles" description={catalog.error} />
      ) : (
        <>
          <p className="text-sm text-muted">
            {catalog.total} vehicle{catalog.total === 1 ? "" : "s"}
          </p>
          <VehicleGrid vehicles={catalog.vehicles} />
          <VehiclePagination
            filters={displayFilters}
            page={catalog.page}
            totalPages={catalog.totalPages}
          />
        </>
      )}
    </section>
  );
}
