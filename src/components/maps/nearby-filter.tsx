"use client";

import { useState } from "react";
import { LocationSearch } from "@/components/maps/location-search";
import { MapsProvider } from "@/components/maps/maps-provider";
import { Button } from "@/components/ui/button";
import { DEFAULT_NEARBY_RADIUS_METERS } from "@/lib/geo/constants";
import {
  geolocationMessage,
  readBrowserLocation,
} from "@/lib/maps/geolocation";

export function NearbyFilter({
  latitude,
  longitude,
  radiusMeters,
}: {
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;
}) {
  const [lat, setLat] = useState(latitude ?? "");
  const [lng, setLng] = useState(longitude ?? "");
  const [radius, setRadius] = useState(radiusMeters ?? DEFAULT_NEARBY_RADIUS_METERS);
  const [label, setLabel] = useState(
    latitude != null && longitude != null ? "Selected search area" : "",
  );
  const [error, setError] = useState<string>();

  return (
    <MapsProvider>
      <div className="space-y-2 sm:col-span-2">
        <LocationSearch
          id="nearby"
          label="Search near a place"
          value={label}
          onSelect={(location) => {
            setLat(location.latitude);
            setLng(location.longitude);
            setLabel(location.address);
            setError(undefined);
          }}
          onQueryChange={(query) => {
            if (!query.trim()) {
              setLat("");
              setLng("");
              setLabel("");
            }
          }}
        />
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-navy">Radius</span>
            <select
              name="radius"
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="rounded-md border border-line bg-paper-strong px-3 py-2 text-sm outline-none ring-navy focus:ring-2"
            >
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={25000}>25 km</option>
              <option value={50000}>50 km</option>
              <option value={100000}>100 km</option>
            </select>
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void readBrowserLocation().then((result) => {
                if (!result.ok) {
                  setError(geolocationMessage(result.reason));
                  return;
                }
                setLat(result.latitude);
                setLng(result.longitude);
                setLabel("Current location");
                setError(undefined);
              });
            }}
          >
            Use my location
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <input type="hidden" name="latitude" value={lat === "" ? "" : String(lat)} />
        <input type="hidden" name="longitude" value={lng === "" ? "" : String(lng)} />
      </div>
    </MapsProvider>
  );
}
