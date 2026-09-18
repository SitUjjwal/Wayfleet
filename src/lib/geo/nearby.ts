import {
  DEFAULT_NEARBY_RADIUS_METERS,
  MAX_NEARBY_RADIUS_METERS,
  MIN_NEARBY_RADIUS_METERS,
} from "@/lib/geo/constants";
import type { NearbySearch } from "@/lib/geo/types";
import {
  GeoValidationError,
  parseLatitude,
  parseLongitude,
} from "@/lib/geo/validate";

export function parseNearbySearch(input: {
  latitude?: string | null;
  longitude?: string | null;
  radius?: string | null;
}): NearbySearch | null {
  const hasLat = Boolean(input.latitude?.trim());
  const hasLng = Boolean(input.longitude?.trim());
  if (!hasLat && !hasLng && !input.radius?.trim()) {
    return null;
  }
  if (!hasLat || !hasLng) {
    throw new GeoValidationError(
      "latitude",
      "Nearby search requires both latitude and longitude",
    );
  }

  const latitude = parseLatitude(input.latitude, "latitude");
  const longitude = parseLongitude(input.longitude, "longitude");

  let radiusMeters = DEFAULT_NEARBY_RADIUS_METERS;
  if (input.radius?.trim()) {
    const parsed = Number(input.radius);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      throw new GeoValidationError("radius", "Radius must be an integer number of meters");
    }
    if (parsed < 0) {
      throw new GeoValidationError("radius", "Radius cannot be negative");
    }
    if (parsed < MIN_NEARBY_RADIUS_METERS) {
      throw new GeoValidationError("radius", "Radius is too small");
    }
    if (parsed > MAX_NEARBY_RADIUS_METERS) {
      throw new GeoValidationError("radius", "Radius exceeds the maximum of 100 km");
    }
    radiusMeters = parsed;
  }

  return { latitude, longitude, radiusMeters };
}

export function geoNearStage(
  nearby: NearbySearch,
  query: Record<string, unknown>,
) {
  return {
    $geoNear: {
      near: {
        type: "Point" as const,
        coordinates: [nearby.longitude, nearby.latitude] as [number, number],
      },
      distanceField: "distanceMeters",
      maxDistance: nearby.radiusMeters,
      spherical: true,
      query,
      key: "location.point",
    },
  };
}
