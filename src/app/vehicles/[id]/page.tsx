import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { BookingForm } from "@/components/booking/booking-form";
import { VehicleLocationSection } from "@/components/maps/vehicle-location-section";
import { VehicleGallery } from "@/components/marketplace/vehicle-detail";
import { getCurrentUser } from "@/server/auth/guards";
import { toCatalogVehicle } from "@/server/vehicles/dto";
import { VehicleHttpError } from "@/server/vehicles/errors";
import { getPublicVehicleById } from "@/server/vehicles/service";
import type { PricingUnit } from "@/types/domain";
import { CATEGORY_LABELS } from "@/lib/labels";
import { formatMinorUnits } from "@/lib/money";

type VehicleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: VehicleDetailPageProps) {
  try {
    const vehicle = await getPublicVehicleById((await params).id);
    return { title: `${vehicle.brand} ${vehicle.model} — Wayfleet` };
  } catch {
    return { title: "Vehicle not found — Wayfleet" };
  }
}

export default async function VehicleDetailPage({
  params,
}: VehicleDetailPageProps) {
  let vehicle;
  try {
    vehicle = await getPublicVehicleById((await params).id);
  } catch (error) {
    if (error instanceof VehicleHttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const viewer = await getCurrentUser();
  const catalog = toCatalogVehicle(vehicle);
  const place = catalog.location.city
    ? `${catalog.location.label}, ${catalog.location.city}`
    : catalog.location.label;

  return (
    <article className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <p className="text-sm">
        <Link href="/vehicles" className="text-navy underline">
          Back to fleet
        </Link>
      </p>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <VehicleGallery vehicle={catalog} />
        <div className="space-y-5">
          <div>
            <p className="text-sm text-muted">{CATEGORY_LABELS[catalog.category]}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-navy">
              {catalog.brand} {catalog.model}
            </h1>
            <p className="mt-2 text-sm text-muted">{place}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={catalog.vendorVerified ? "success" : "warning"}>
              {catalog.vendorVerified ? "Verified vendor" : "Unverified vendor"}
            </Badge>
            <StatusIndicator availability={catalog.availability} />
          </div>
          <p className="text-2xl font-semibold text-navy">
            {formatMinorUnits(catalog.pricing.amount, catalog.pricing.currency)}
            <span className="ml-2 text-base font-normal text-muted">per day</span>
          </p>
          <p className="text-sm text-ink">
            Rating {catalog.rating.average.toFixed(1)} from {catalog.rating.count}{" "}
            reviews
          </p>
          <BookingForm
            vehicleId={catalog.id}
            vehicleName={`${catalog.brand} ${catalog.model}`}
            unitAmount={catalog.pricing.amount}
            currency={catalog.pricing.currency}
            unit={catalog.pricing.unit as PricingUnit}
            canBook={catalog.availability === "available"}
            unavailableReason={
              catalog.availability === "available"
                ? undefined
                : "This listing is marked unavailable or in maintenance. Time-based reservations do not change that setting."
            }
            signedIn={Boolean(viewer)}
            isCustomer={viewer?.role === "customer"}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-navy">Vehicle information</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {catalog.description || "No description provided."}
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold text-navy">Vendor</h2>
          <p className="mt-2 font-medium text-ink">{vehicle.vendor.businessName}</p>
          <p className="mt-2 text-sm text-muted">
            Verification: {vehicle.vendor.verificationStatus}
          </p>
          <p className="mt-2 text-sm text-muted">
            Vendor rating {vehicle.vendor.rating.average.toFixed(1)} (
            {vehicle.vendor.rating.count} reviews)
          </p>
        </Card>
      </div>
      <Card>
        <VehicleLocationSection
          city={catalog.location.city}
          label={catalog.location.label}
          latitude={catalog.location.latitude}
          longitude={catalog.location.longitude}
        />
      </Card>
    </article>
  );
}
