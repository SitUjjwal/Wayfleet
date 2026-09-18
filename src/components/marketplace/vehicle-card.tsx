import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { CatalogVehicle } from "@/features/vehicles/types";
import { CATEGORY_LABELS } from "@/lib/labels";
import { formatMinorUnits } from "@/lib/money";
import Link from "next/link";

export function VehiclePhoto({
  vehicle,
  className = "h-44",
}: {
  vehicle: CatalogVehicle;
  className?: string;
}) {
  const place = vehicle.location.city ?? vehicle.location.label;
  const alt = `${vehicle.brand} ${vehicle.model} in ${place}`;
  const photo = vehicle.images.find((url) => /^https?:\/\//i.test(url));

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt={alt} className={`w-full object-cover ${className}`} />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`flex w-full items-center justify-center bg-gradient-to-br from-navy to-navy-deep text-sm font-medium tracking-wide text-white ${className}`}
    >
      {CATEGORY_LABELS[vehicle.category]}
    </div>
  );
}

export function VehicleCard({ vehicle }: { vehicle: CatalogVehicle }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-paper-strong shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/vehicles/${vehicle.id}`} className="block">
        <VehiclePhoto vehicle={vehicle} />
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-navy">
                {vehicle.brand} {vehicle.model}
              </h3>
              <p className="text-sm text-muted">{CATEGORY_LABELS[vehicle.category]}</p>
            </div>
            <Badge tone={vehicle.vendorVerified ? "success" : "warning"}>
              {vehicle.vendorVerified ? "Verified vendor" : "Unverified vendor"}
            </Badge>
          </div>
          <p className="text-sm text-ink">{vehicle.vendorName}</p>
          <p className="text-sm text-muted">
            {vehicle.location.label}
            {vehicle.location.city && vehicle.location.city !== vehicle.location.label
              ? `, ${vehicle.location.city}`
              : ""}
          </p>
          <div className="flex items-center justify-between gap-3 text-sm">
            <StatusIndicator availability={vehicle.availability} />
            <p>
              <span className="sr-only">Rating </span>
              {vehicle.rating.average.toFixed(1)} ({vehicle.rating.count} reviews)
            </p>
          </div>
          <p className="font-semibold text-navy">
            {formatMinorUnits(vehicle.pricing.amount, vehicle.pricing.currency)}
            <span className="ml-1 text-sm font-normal text-muted">/ day</span>
          </p>
        </div>
      </Link>
    </article>
  );
}
