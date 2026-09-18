import Link from "next/link";
import {
  vehicleFiltersToSearchParams,
  type VehicleFilterState,
} from "@/features/vehicles/filter-vehicles";

export function VehiclePagination({
  filters,
  page,
  totalPages,
}: {
  filters: VehicleFilterState;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const hrefFor = (nextPage: number) => {
    const params = vehicleFiltersToSearchParams({ ...filters, page: nextPage });
    const query = params.toString();
    return query ? `/vehicles?${query}` : "/vehicles";
  };

  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="text-sm text-navy underline">
          Previous
        </Link>
      ) : (
        <span className="text-sm text-muted">Previous</span>
      )}
      <p className="text-sm text-muted">
        Page {page} of {totalPages}
      </p>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="text-sm text-navy underline">
          Next
        </Link>
      ) : (
        <span className="text-sm text-muted">Next</span>
      )}
    </nav>
  );
}
