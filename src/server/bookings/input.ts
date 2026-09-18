import { MAX_BOOKING_DURATION_MS, PAST_START_TOLERANCE_MS } from "@/lib/booking/pricing";
import { isBookingAction, type BookingAction } from "@/lib/booking/transitions";
import { isValidObjectId } from "@/lib/db";
import type { StoredLocation } from "@/lib/geo/types";
import { GeoValidationError, parseLocationInput, toStoredLocation } from "@/lib/geo/validate";
import { BookingHttpError } from "@/server/bookings/errors";

const FORBIDDEN_WRITE_KEYS = [
  "customer",
  "customerId",
  "vendor",
  "vendorId",
  "amount",
  "currency",
  "bookingStatus",
  "paymentStatus",
  "snapshot",
  "cancellation",
  "_id",
  "id",
] as const;

export type BookingCreateInput = {
  vehicleId: string;
  pickup: StoredLocation;
  destination: StoredLocation;
  startsAt: Date;
  endsAt: Date;
};

export type BookingPatchInput = {
  action: BookingAction;
  reason?: string;
};

function asBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BookingHttpError(422, "Validation error");
  }
  return body as Record<string, unknown>;
}

export function rejectUnauthorizedBookingFields(body: Record<string, unknown>): void {
  for (const key of FORBIDDEN_WRITE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      throw new BookingHttpError(422, "Unauthorized field cannot be modified");
    }
  }
}

function parseLocation(value: unknown, field: string): StoredLocation {
  try {
    return toStoredLocation(parseLocationInput(value, field));
  } catch (error) {
    if (error instanceof GeoValidationError) {
      throw new BookingHttpError(422, "Validation error", {
        [field]: error.message,
      });
    }
    throw error;
  }
}

function parseDate(value: unknown, field: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  throw new BookingHttpError(422, "Validation error", {
    [field]: "Enter a valid date and time",
  });
}

export function parseBookingCreateBody(
  body: unknown,
  now = new Date(),
): BookingCreateInput {
  const input = asBody(body);
  rejectUnauthorizedBookingFields(input);

  if (!isValidObjectId(input.vehicleId)) {
    throw new BookingHttpError(400, "Invalid vehicle id", {
      vehicleId: "Choose a valid vehicle",
    });
  }

  const startsAt = parseDate(input.startsAt ?? input.start, "startsAt");
  const endsAt = parseDate(input.endsAt ?? input.end, "endsAt");

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new BookingHttpError(422, "Validation error", {
      endsAt: "End time must be after the start time",
    });
  }
  if (startsAt.getTime() < now.getTime() - PAST_START_TOLERANCE_MS) {
    throw new BookingHttpError(422, "Validation error", {
      startsAt: "Start time cannot be in the past",
    });
  }
  if (endsAt.getTime() - startsAt.getTime() > MAX_BOOKING_DURATION_MS) {
    throw new BookingHttpError(422, "Validation error", {
      endsAt: "Bookings cannot exceed 30 days",
    });
  }

  return {
    vehicleId: input.vehicleId,
    pickup: parseLocation(input.pickup ?? input.pickupLocation, "pickup"),
    destination: parseLocation(input.destination, "destination"),
    startsAt,
    endsAt,
  };
}

export function parseBookingPatchBody(body: unknown): BookingPatchInput {
  const input = asBody(body);
  rejectUnauthorizedBookingFields(input);
  const actionRaw = typeof input.action === "string" ? input.action : "";
  if (!isBookingAction(actionRaw)) {
    throw new BookingHttpError(422, "Validation error", {
      action: "Choose a valid booking action",
    });
  }
  const reason =
    typeof input.reason === "string" || typeof input.cancellationReason === "string"
      ? String(input.reason ?? input.cancellationReason).trim()
      : undefined;
  if (reason && reason.length > 300) {
    throw new BookingHttpError(422, "Validation error", {
      reason: "Keep the reason under 300 characters",
    });
  }
  return { action: actionRaw, ...(reason ? { reason } : {}) };
}
