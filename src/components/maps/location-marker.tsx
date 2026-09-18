"use client";

import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

export function LocationMarker({
  latitude,
  longitude,
  title,
}: {
  latitude: number;
  longitude: number;
  title?: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === "undefined" || !google.maps?.Marker) {
      return;
    }
    const marker = new google.maps.Marker({
      map,
      position: { lat: latitude, lng: longitude },
      title: title ?? "Selected location",
    });
    return () => {
      marker.setMap(null);
    };
  }, [map, latitude, longitude, title]);

  return null;
}
