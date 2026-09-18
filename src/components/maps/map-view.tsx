"use client";

import { Map } from "@vis.gl/react-google-maps";
import { LocationMarker } from "@/components/maps/location-marker";
import { getBrowserGoogleMapsKey } from "@/lib/maps/config";

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

export function MapView({
  latitude,
  longitude,
  zoom = 12,
  title,
  className = "h-64 w-full overflow-hidden rounded-xl border border-line",
}: {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  title?: string;
  className?: string;
}) {
  const apiKey = getBrowserGoogleMapsKey();
  if (!apiKey) {
    return (
      <div
        className={`flex items-center justify-center bg-paper p-4 text-sm text-muted ${className}`}
        role="status"
        data-map-state="missing-key"
      >
        Google Maps is not configured. You can still search or enter coordinates.
      </div>
    );
  }

  const hasPoint =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const center = hasPoint
    ? { lat: latitude, lng: longitude }
    : DEFAULT_CENTER;

  return (
    <div className={className} data-map-state="ready">
      <Map
        defaultCenter={center}
        defaultZoom={hasPoint ? zoom : 5}
        center={hasPoint ? center : undefined}
        zoom={hasPoint ? zoom : 5}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: "100%", height: "100%" }}
        aria-label={title ?? "Map"}
      >
        {hasPoint ? (
          <LocationMarker latitude={latitude} longitude={longitude} title={title} />
        ) : null}
      </Map>
    </div>
  );
}
