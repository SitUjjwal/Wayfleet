import {
  TRACKING_FUTURE_MS,
  TRACKING_MAX_ACCURACY_METERS,
  TRACKING_MAX_SPEED_MPS,
  TRACKING_STALE_MS,
} from "@/lib/tracking/constants";
import {
  GeoValidationError,
  hasMongoOperatorKeys,
  parseLatitude,
  parseLongitude,
  toGeoPoint,
} from "@/lib/geo/validate";

export type TrackingLocationInput = {
  bookingId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  recordedAt: Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readOptionalNumber(value: unknown): number | undefined {
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

function parseOptionalRange(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = readOptionalNumber(value);
  if (parsed === undefined || !Number.isFinite(parsed)) {
    throw new GeoValidationError(field, `Enter a valid ${field}`);
  }
  if (parsed < min || parsed > max) {
    throw new GeoValidationError(field, `${field} is out of range`);
  }
  return parsed;
}

function parseRecordedAt(value: unknown, now: number): Date {
  if (value === undefined || value === null || value === "") {
    return new Date(now);
  }
  const parsed =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : typeof value === "string"
          ? Date.parse(value)
          : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw new GeoValidationError("recordedAt", "Enter a valid timestamp");
  }
  if (parsed - now > TRACKING_FUTURE_MS) {
    throw new GeoValidationError("recordedAt", "Location timestamp is in the future");
  }
  if (now - parsed > TRACKING_STALE_MS) {
    throw new GeoValidationError("recordedAt", "Location timestamp is stale");
  }
  return new Date(parsed);
}

export function parseTrackingLocationPayload(
  value: unknown,
  now = Date.now(),
): TrackingLocationInput {
  if (!isRecord(value) || hasMongoOperatorKeys(value)) {
    throw new GeoValidationError("location", "Enter a valid location payload");
  }

  const bookingId = typeof value.bookingId === "string" ? value.bookingId.trim() : "";
  if (!bookingId) {
    throw new GeoValidationError("bookingId", "Enter a valid booking id");
  }

  const latitude = parseLatitude(value.latitude, "latitude");
  const longitude = parseLongitude(value.longitude, "longitude");
  const accuracy = parseOptionalRange(
    value.accuracy,
    "accuracy",
    0,
    TRACKING_MAX_ACCURACY_METERS,
  );
  const heading = parseOptionalRange(value.heading, "heading", 0, 360);
  const speed = parseOptionalRange(value.speed, "speed", 0, TRACKING_MAX_SPEED_MPS);
  const recordedAt = parseRecordedAt(value.recordedAt, now);

  toGeoPoint(longitude, latitude);

  return {
    bookingId,
    latitude,
    longitude,
    recordedAt,
    ...(accuracy !== undefined ? { accuracy } : {}),
    ...(heading !== undefined ? { heading } : {}),
    ...(speed !== undefined ? { speed } : {}),
  };
}
