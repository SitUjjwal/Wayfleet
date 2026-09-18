"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import { LiveVehicleMarker } from "@/components/maps/live-vehicle-marker";
import { MapsProvider } from "@/components/maps/maps-provider";
import { getBrowserGoogleMapsKey } from "@/lib/maps/config";

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

function RecenterOnce({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!map || fitted.current) {
      return;
    }
    map.panTo({ lat: latitude, lng: longitude });
    fitted.current = true;
  }, [map, latitude, longitude]);

  return null;
}

export function TrackingMap({
  latitude,
  longitude,
  title = "Live vehicle location",
}: {
  latitude?: number;
  longitude?: number;
  title?: string;
}) {
  const apiKey = getBrowserGoogleMapsKey();
  if (!apiKey) {
    return (
      <div
        className="flex h-72 w-full items-center justify-center rounded-xl border border-line bg-paper p-4 text-sm text-muted"
        role="status"
        data-map-state="missing-key"
      >
        Google Maps is not configured. Live coordinates still appear below when available.
      </div>
    );
  }

  const hasPoint =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const center = hasPoint ? { lat: latitude, lng: longitude } : DEFAULT_CENTER;

  return (
    <MapsProvider>
      <div className="h-72 w-full overflow-hidden rounded-xl border border-line" data-map-state="ready">
        <Map
          defaultCenter={center}
          defaultZoom={hasPoint ? 14 : 5}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: "100%", height: "100%" }}
          aria-label={title}
        >
          {hasPoint ? (
            <>
              <RecenterOnce latitude={latitude} longitude={longitude} />
              <LiveVehicleMarker latitude={latitude} longitude={longitude} title={title} />
            </>
          ) : null}
        </Map>
      </div>
    </MapsProvider>
  );
}
