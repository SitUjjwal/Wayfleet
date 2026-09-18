"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

export function LiveVehicleMarker({
  latitude,
  longitude,
  title = "Vehicle",
}: {
  latitude: number;
  longitude: number;
  title?: string;
}) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined" || !google.maps?.Marker) {
      return;
    }
    const position = { lat: latitude, lng: longitude };
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map,
        position,
        title,
      });
    } else {
      markerRef.current.setPosition(position);
      markerRef.current.setTitle(title);
    }
  }, [map, latitude, longitude, title]);

  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, [map]);

  return null;
}
