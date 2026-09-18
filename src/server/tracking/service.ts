import "server-only";

import { GeoValidationError } from "@/lib/geo/validate";
import { isTrackingEligible } from "@/lib/tracking/eligibility";
import { parseTrackingLocationPayload } from "@/lib/tracking/validate";
import type { SessionUser } from "@/server/auth/types";
import {
  authorizeTrackingPublish,
  authorizeTrackingSubscribe,
  loadTrackingBooking,
} from "@/server/tracking/authorize";
import { requireVendorProfile } from "@/server/vendors/profile";
import type { TrackingSnapshotDto } from "@/server/tracking/dto";
import {
  TrackingHttpError,
  trackingErrorFromGeo,
} from "@/server/tracking/errors";
import { TrackingRateLimiter } from "@/server/tracking/rate-limit";
import { findLatestPosition, upsertLatestPosition } from "@/server/tracking/store";
import { getTrackingMinIntervalMs } from "@/lib/realtime/config";

const limiter = new TrackingRateLimiter(getTrackingMinIntervalMs());

export async function getTrackingSnapshotForUser(
  user: SessionUser,
  bookingId: string,
): Promise<TrackingSnapshotDto> {
  const booking = await loadTrackingBooking(bookingId);
  if (user.role === "customer") {
    if (booking.customer.toString() !== user.id) {
      throw new TrackingHttpError(403, "TRACKING_FORBIDDEN", "Forbidden");
    }
  } else if (user.role === "vendor") {
    const vendor = await requireVendorProfile(user);
    if (booking.vendor.toString() !== vendor._id.toString()) {
      throw new TrackingHttpError(403, "TRACKING_FORBIDDEN", "Forbidden");
    }
  } else {
    throw new TrackingHttpError(403, "TRACKING_FORBIDDEN", "Forbidden");
  }

  const trackingActive = isTrackingEligible(booking.bookingStatus);
  const canPublish = user.role === "vendor" && trackingActive;
  const position = trackingActive ? await findLatestPosition(booking._id.toString()) : null;

  return {
    bookingId: booking._id.toString(),
    bookingStatus: booking.bookingStatus,
    trackingActive,
    canPublish,
    position,
  };
}

export async function joinTrackingForUser(user: SessionUser, bookingId: string) {
  const context = await authorizeTrackingSubscribe(user, bookingId);
  const position = await findLatestPosition(context.bookingId);
  return {
    context,
    position,
    snapshot: {
      bookingId: context.bookingId,
      bookingStatus: context.bookingStatus,
      trackingActive: true,
      canPublish: user.role === "vendor",
      position,
    } satisfies TrackingSnapshotDto,
  };
}

export async function publishTrackingLocationForUser(
  user: SessionUser,
  payload: unknown,
  now = Date.now(),
) {
  let input;
  try {
    input = parseTrackingLocationPayload(payload, now);
  } catch (error) {
    if (error instanceof GeoValidationError) {
      throw trackingErrorFromGeo(error.field, error.message);
    }
    throw error;
  }

  const context = await authorizeTrackingPublish(user, input.bookingId);
  const rateKey = `${user.id}:${context.bookingId}`;
  const rate = limiter.check(rateKey, input.latitude, input.longitude, now);
  if (rate === "rate_limited") {
    throw new TrackingHttpError(
      429,
      "TRACKING_RATE_LIMITED",
      "Location updates are too frequent",
    );
  }
  if (rate === "unchanged") {
    const existing = await findLatestPosition(context.bookingId);
    return { context, position: existing, skipped: true as const };
  }

  const position = await upsertLatestPosition(context, input, now);
  return { context, position, skipped: false as const };
}

export { limiter as trackingRateLimiter };
