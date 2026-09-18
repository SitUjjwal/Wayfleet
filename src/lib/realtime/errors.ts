export const TRACKING_ERROR_CODES = [
  "TRACKING_UNAUTHORIZED",
  "TRACKING_FORBIDDEN",
  "TRACKING_NOT_ACTIVE",
  "INVALID_LOCATION",
  "STALE_LOCATION",
  "TRACKING_RATE_LIMITED",
  "TRACKING_INVALID_BOOKING",
] as const;

export type TrackingErrorCode = (typeof TRACKING_ERROR_CODES)[number];

export function isTrackingErrorCode(value: unknown): value is TrackingErrorCode {
  return (
    typeof value === "string" &&
    (TRACKING_ERROR_CODES as readonly string[]).includes(value)
  );
}
