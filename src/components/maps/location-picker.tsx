"use client";

import { useState } from "react";
import { LocationSearch } from "@/components/maps/location-search";
import { LocationSummary } from "@/components/maps/location-summary";
import { MapView } from "@/components/maps/map-view";
import { MapsProvider } from "@/components/maps/maps-provider";
import { Button } from "@/components/ui/button";
import type { LocationInput } from "@/lib/geo/types";
import { parseLatitude, parseLongitude, GeoValidationError } from "@/lib/geo/validate";
import {
  geolocationMessage,
  readBrowserLocation,
} from "@/lib/maps/geolocation";
import { locationFromCoordinates } from "@/lib/maps/places";

export function LocationPicker({
  id,
  label,
  value,
  error,
  showMap = true,
  onChange,
}: {
  id: string;
  label: string;
  value?: LocationInput | null;
  error?: string;
  showMap?: boolean;
  onChange: (location: LocationInput | null) => void;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualError, setManualError] = useState<string>();
  const [geoError, setGeoError] = useState<string>();
  const [pendingGeo, setPendingGeo] = useState(false);

  function applyManual(form: HTMLFormElement) {
    const data = new FormData(form);
    try {
      const latitude = parseLatitude(data.get("latitude"), "latitude");
      const longitude = parseLongitude(data.get("longitude"), "longitude");
      const address = String(data.get("address") ?? "").trim() || "Selected location";
      setManualError(undefined);
      onChange(locationFromCoordinates(latitude, longitude, address));
    } catch (caught) {
      setManualError(
        caught instanceof GeoValidationError
          ? caught.message
          : "Enter valid coordinates",
      );
    }
  }

  return (
    <MapsProvider>
      <div className="space-y-3" data-location-picker={id}>
        <LocationSearch
          key={value ? `${value.latitude},${value.longitude}` : "empty"}
          id={id}
          label={label}
          value={value?.address}
          error={error}
          onSelect={onChange}
          onQueryChange={(query) => {
            if (!query.trim()) {
              onChange(null);
            }
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={pendingGeo}
            onClick={() => {
              setPendingGeo(true);
              setGeoError(undefined);
              void readBrowserLocation().then((result) => {
                setPendingGeo(false);
                if (!result.ok) {
                  setGeoError(geolocationMessage(result.reason));
                  return;
                }
                onChange(
                  locationFromCoordinates(
                    result.latitude,
                    result.longitude,
                    "Current location",
                  ),
                );
              });
            }}
          >
            {pendingGeo ? "Reading location…" : "Use my current location"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setManualOpen((open) => !open)}
          >
            {manualOpen ? "Hide coordinates" : "Enter coordinates"}
          </Button>
        </div>
        {geoError ? (
          <p role="alert" className="text-sm text-danger">
            {geoError}
          </p>
        ) : null}
        {manualOpen ? (
          <form
            className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              applyManual(event.currentTarget);
            }}
          >
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium text-navy">Address</span>
              <input
                name="address"
                defaultValue={value?.address ?? ""}
                className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none ring-navy focus:ring-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-navy">Latitude</span>
              <input
                name="latitude"
                inputMode="decimal"
                defaultValue={value?.latitude ?? ""}
                className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none ring-navy focus:ring-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-navy">Longitude</span>
              <input
                name="longitude"
                inputMode="decimal"
                defaultValue={value?.longitude ?? ""}
                className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none ring-navy focus:ring-2"
              />
            </label>
            {manualError ? (
              <p className="text-sm text-danger sm:col-span-2" role="alert">
                {manualError}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary">
                Use these coordinates
              </Button>
            </div>
          </form>
        ) : null}
        <LocationSummary location={value} />
        {showMap ? (
          <MapView
            latitude={value?.latitude}
            longitude={value?.longitude}
            title={value?.address}
          />
        ) : null}
      </div>
    </MapsProvider>
  );
}
