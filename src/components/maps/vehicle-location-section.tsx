"use client";

import { LocationSummary } from "@/components/maps/location-summary";
import { MapView } from "@/components/maps/map-view";
import { MapsProvider } from "@/components/maps/maps-provider";
import type { LocationInput } from "@/lib/geo/types";

export function VehicleLocationSection({
  city,
  label,
  latitude,
  longitude,
}: {
  city?: string;
  label: string;
  latitude?: number;
  longitude?: number;
}) {
  const location: LocationInput | null =
    latitude !== undefined && longitude !== undefined
      ? {
          address: city ? `${city} area` : label,
          ...(city ? { city } : {}),
          latitude,
          longitude,
        }
      : null;

  return (
    <MapsProvider>
      <div className="space-y-3">
        <h2 className="font-semibold text-navy">Operating area</h2>
        <p className="text-sm text-muted">
          The map shows an approximate public location, not a private street address.
        </p>
        <LocationSummary
          location={location}
          emptyLabel="This listing has no public map coordinates yet."
        />
        <MapView
          latitude={latitude}
          longitude={longitude}
          title={city ? `${city} area` : "Vehicle area"}
          zoom={11}
        />
      </div>
    </MapsProvider>
  );
}
