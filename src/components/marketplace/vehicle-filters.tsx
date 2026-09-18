import { NearbyFilter } from "@/components/maps/nearby-filter";
import { CategorySelector, VehicleSearch } from "@/components/marketplace/vehicle-search";
import type { VehicleFilterState } from "@/features/vehicles/filter-vehicles";

export function VehicleFilters({ filters }: { filters: VehicleFilterState }) {
  return (
    <form
      method="get"
      className="grid gap-4 rounded-xl border border-line bg-paper-strong p-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Filter vehicles"
    >
      <div className="sm:col-span-2">
        <VehicleSearch defaultValue={filters.query} />
      </div>
      <CategorySelector defaultValue={filters.category} />
      <NearbyFilter
        latitude={filters.latitude}
        longitude={filters.longitude}
        radiusMeters={filters.radiusMeters}
      />
      <div className="space-y-1.5">
        <label htmlFor="location" className="block text-sm font-medium text-navy">
          City
        </label>
        <input
          id="location"
          name="location"
          defaultValue={filters.location}
          placeholder="City"
          className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="minPrice" className="block text-sm font-medium text-navy">
          Min price (₹ / day)
        </label>
        <input
          id="minPrice"
          name="minPrice"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={filters.minPriceRupees ?? ""}
          className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="maxPrice" className="block text-sm font-medium text-navy">
          Max price (₹ / day)
        </label>
        <input
          id="maxPrice"
          name="maxPrice"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={filters.maxPriceRupees ?? ""}
          className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="minRating" className="block text-sm font-medium text-navy">
          Minimum rating
        </label>
        <select
          id="minRating"
          name="minRating"
          defaultValue={filters.minRating ?? ""}
          className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
        >
          <option value="">Any rating</option>
          <option value="4">4.0 and above</option>
          <option value="4.5">4.5 and above</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="availability" className="block text-sm font-medium text-navy">
          Availability
        </label>
        <select
          id="availability"
          name="availability"
          defaultValue={filters.availability}
          className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
        >
          <option value="all">Any status</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
          <option value="maintenance">In maintenance</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="sort" className="block text-sm font-medium text-navy">
          Sort
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={filters.sort}
          className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
        >
          <option value="recommended">Recommended</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="rating">Rating</option>
        </select>
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-paper-strong hover:bg-navy-deep"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}
