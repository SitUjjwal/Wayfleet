import type { LocationInput } from "@/lib/geo/types";

export function LocationSummary({
  location,
  emptyLabel = "No location selected",
}: {
  location?: LocationInput | null;
  emptyLabel?: string;
}) {
  if (!location) {
    return (
      <p className="text-sm text-muted" data-location-summary="empty">
        {emptyLabel}
      </p>
    );
  }
  return (
    <div className="rounded-md border border-line bg-paper p-3 text-sm" data-location-summary="selected">
      <p className="font-medium text-navy">{location.address}</p>
      <p className="mt-1 text-muted">
        {[location.city, location.state, location.country].filter(Boolean).join(", ")}
      </p>
      <p className="mt-1 text-muted">
        {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
      </p>
    </div>
  );
}
