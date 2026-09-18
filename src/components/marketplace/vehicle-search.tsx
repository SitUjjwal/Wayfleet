import { VEHICLE_CATEGORIES } from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/labels";

type VehicleSearchProps = {
  defaultValue?: string;
};

export function VehicleSearch({ defaultValue = "" }: VehicleSearchProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="vehicle-search" className="block text-sm font-medium text-navy">
        Search
      </label>
      <input
        id="vehicle-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Brand, model, vendor, or city"
        className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
      />
    </div>
  );
}

type CategorySelectorProps = {
  name?: string;
  id?: string;
  defaultValue?: string;
  includeAll?: boolean;
};

export function CategorySelector({
  name = "category",
  id = "category",
  defaultValue = "all",
  includeAll = true,
}: CategorySelectorProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        Category
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
      >
        {includeAll ? <option value="all">All categories</option> : null}
        {VEHICLE_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </option>
        ))}
      </select>
    </div>
  );
}
