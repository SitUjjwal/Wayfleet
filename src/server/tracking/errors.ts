import type { TrackingErrorCode } from "@/lib/realtime/errors";
import type { BookingStatus } from "@/types/domain";

export class TrackingHttpError extends Error {
  readonly status: number;
  readonly code: TrackingErrorCode;
  readonly fields?: Record<string, string>;
  readonly bookingStatus?: BookingStatus;

  constructor(
    status: number,
    code: TrackingErrorCode,
    message: string,
    fields?: Record<string, string>,
    bookingStatus?: BookingStatus,
  ) {
    super(message);
    this.name = "TrackingHttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.bookingStatus = bookingStatus;
  }
}

export function trackingErrorFromGeo(field: string, message: string): TrackingHttpError {
  const code = field === "recordedAt" && /stale/i.test(message)
    ? "STALE_LOCATION"
    : "INVALID_LOCATION";
  const status = code === "STALE_LOCATION" ? 422 : 422;
  return new TrackingHttpError(status, code, message, { [field]: message });
}
