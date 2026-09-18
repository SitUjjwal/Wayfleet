import {
  MAX_LATITUDE,
  MAX_LONGITUDE,
  MIN_LATITUDE,
  MIN_LONGITUDE,
  PUBLIC_COORDINATE_DECIMALS,
} from "@/lib/geo/constants";
import type {
  GeoPoint,
  LocationInput,
  PreciseLocation,
  PublicLocation,
  StoredLocation,
} from "@/lib/geo/types";

export class GeoValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "GeoValidationError";
    this.field = field;
  }
}

const OPERATOR_KEY = /^\$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function hasMongoOperatorKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasMongoOperatorKeys);
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.keys(value).some(
    (key) => OPERATOR_KEY.test(key) || hasMongoOperatorKeys(value[key]),
  );
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }
  return Number.NaN;
}

export function parseLatitude(value: unknown, field = "latitude"): number {
  const parsed = readNumber(value);
  if (parsed === undefined || !Number.isFinite(parsed)) {
    throw new GeoValidationError(field, "Enter a valid latitude");
  }
  if (parsed < MIN_LATITUDE || parsed > MAX_LATITUDE) {
    throw new GeoValidationError(field, "Latitude must be between -90 and 90");
  }
  return parsed;
}

export function parseLongitude(value: unknown, field = "longitude"): number {
  const parsed = readNumber(value);
  if (parsed === undefined || !Number.isFinite(parsed)) {
    throw new GeoValidationError(field, "Enter a valid longitude");
  }
  if (parsed < MIN_LONGITUDE || parsed > MAX_LONGITUDE) {
    throw new GeoValidationError(field, "Longitude must be between -180 and 180");
  }
  return parsed;
}

export function toGeoPoint(longitude: number, latitude: number): GeoPoint {
  return {
    type: "Point",
    coordinates: [longitude, latitude],
  };
}

export function parseGeoPoint(value: unknown, field = "point"): GeoPoint {
  if (!isRecord(value) || hasMongoOperatorKeys(value)) {
    throw new GeoValidationError(field, "Enter a valid GeoJSON Point");
  }
  if (value.type !== "Point") {
    throw new GeoValidationError(field, "GeoJSON type must be Point");
  }
  if (!Array.isArray(value.coordinates) || value.coordinates.length !== 2) {
    throw new GeoValidationError(field, "GeoJSON coordinates must be [longitude, latitude]");
  }
  const longitude = parseLongitude(value.coordinates[0], field);
  const latitude = parseLatitude(value.coordinates[1], field);
  return toGeoPoint(longitude, latitude);
}

function optionalText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, max);
}

export function parseLocationInput(
  value: unknown,
  field = "location",
): LocationInput {
  if (typeof value === "string") {
    throw new GeoValidationError(
      field,
      "Select a location with valid coordinates",
    );
  }
  if (!isRecord(value) || hasMongoOperatorKeys(value)) {
    throw new GeoValidationError(field, "Enter a valid location");
  }

  const address = String(
    value.address ?? value.label ?? value.city ?? "",
  ).trim();
  if (!address) {
    throw new GeoValidationError(field, "Enter a location address");
  }

  let latitude: number | undefined;
  let longitude: number | undefined;
  if (value.latitude !== undefined || value.lat !== undefined) {
    latitude = parseLatitude(value.latitude ?? value.lat, field);
  }
  if (value.longitude !== undefined || value.lng !== undefined) {
    longitude = parseLongitude(value.longitude ?? value.lng, field);
  }

  if (value.point !== undefined || value.coordinates !== undefined) {
    const point = parseGeoPoint(
      value.point ?? { type: value.type ?? "Point", coordinates: value.coordinates },
      field,
    );
    if (latitude !== undefined && longitude !== undefined) {
      const reversed =
        point.coordinates[0] === latitude && point.coordinates[1] === longitude;
      const matching =
        point.coordinates[0] === longitude && point.coordinates[1] === latitude;
      if (reversed && !matching) {
        throw new GeoValidationError(
          field,
          "GeoJSON coordinates must be [longitude, latitude]",
        );
      }
      if (!matching && !reversed) {
        throw new GeoValidationError(field, "Coordinates do not match the GeoJSON point");
      }
    }
    longitude = point.coordinates[0];
    latitude = point.coordinates[1];
  }

  if (latitude === undefined || longitude === undefined) {
    throw new GeoValidationError(field, "Select a location with valid coordinates");
  }

  return {
    address: address.slice(0, 200),
    ...(optionalText(value.city, 80) ? { city: optionalText(value.city, 80) } : {}),
    ...(optionalText(value.state, 80) ? { state: optionalText(value.state, 80) } : {}),
    ...(optionalText(value.country, 80)
      ? { country: optionalText(value.country, 80) }
      : {}),
    latitude,
    longitude,
  };
}

export function toStoredLocation(input: LocationInput): StoredLocation {
  return {
    label: input.address,
    ...(input.city ? { city: input.city } : {}),
    ...(input.state ? { state: input.state } : {}),
    ...(input.country ? { country: input.country } : {}),
    lat: input.latitude,
    lng: input.longitude,
    point: toGeoPoint(input.longitude, input.latitude),
  };
}

export function roundPublicCoordinate(value: number): number {
  const factor = 10 ** PUBLIC_COORDINATE_DECIMALS;
  return Math.round(value * factor) / factor;
}

export function generalizePublicLocation(
  location: StoredLocation,
  distanceMeters?: number,
): PublicLocation {
  const city = location.city;
  const label = city && city !== location.label ? city : location.label;
  const dto: PublicLocation = {
    label,
    ...(city ? { city } : {}),
    ...(location.state ? { state: location.state } : {}),
    ...(location.country ? { country: location.country } : {}),
  };
  if (location.lat !== undefined && location.lng !== undefined) {
    dto.latitude = roundPublicCoordinate(location.lat);
    dto.longitude = roundPublicCoordinate(location.lng);
  } else if (location.point) {
    dto.longitude = roundPublicCoordinate(location.point.coordinates[0]);
    dto.latitude = roundPublicCoordinate(location.point.coordinates[1]);
  }
  if (distanceMeters !== undefined && Number.isFinite(distanceMeters)) {
    dto.distanceMeters = Math.round(distanceMeters);
  }
  return dto;
}

export function toPreciseLocation(location: StoredLocation): PreciseLocation {
  const publicLocation = generalizePublicLocation(location);
  const latitude = location.lat ?? location.point?.coordinates[1];
  const longitude = location.lng ?? location.point?.coordinates[0];
  return {
    ...publicLocation,
    label: location.label,
    address: location.label,
    ...(latitude !== undefined && longitude !== undefined
      ? { latitude, longitude }
      : {}),
  };
}

export function storedLocationFromDocument(value: {
  label: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  point?: GeoPoint;
}): StoredLocation {
  return {
    label: value.label,
    ...(value.city ? { city: value.city } : {}),
    ...(value.state ? { state: value.state } : {}),
    ...(value.country ? { country: value.country } : {}),
    ...(value.lat !== undefined ? { lat: value.lat } : {}),
    ...(value.lng !== undefined ? { lng: value.lng } : {}),
    ...(value.point ? { point: value.point } : {}),
  };
}
