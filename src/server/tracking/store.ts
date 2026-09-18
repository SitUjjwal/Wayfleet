import "server-only";

import { toGeoPoint } from "@/lib/geo/validate";
import { TRACKING_POSITION_TTL_MS } from "@/lib/tracking/constants";
import type { TrackingLocationInput } from "@/lib/tracking/validate";
import {
  TripPositionModel,
  type TripPosition,
} from "@/models/trip-position";
import type { TrackingBookingContext } from "@/server/tracking/authorize";
import type { TrackingPositionDto } from "@/server/tracking/dto";
import { sanitizeDbError } from "@/lib/db/connect";
import { TrackingHttpError } from "@/server/tracking/errors";
import type { Types } from "mongoose";

type LeanPosition = TripPosition & { _id: Types.ObjectId };

export function toPositionDto(
  bookingId: string,
  doc: Pick<
    LeanPosition,
    "latitude" | "longitude" | "accuracy" | "heading" | "speed" | "recordedAt" | "source"
  >,
): TrackingPositionDto {
  return {
    bookingId,
    latitude: doc.latitude,
    longitude: doc.longitude,
    recordedAt: doc.recordedAt.toISOString(),
    source: "geolocation",
    ...(doc.accuracy !== undefined ? { accuracy: doc.accuracy } : {}),
    ...(doc.heading !== undefined ? { heading: doc.heading } : {}),
    ...(doc.speed !== undefined ? { speed: doc.speed } : {}),
  };
}

export async function findLatestPosition(
  bookingId: string,
): Promise<TrackingPositionDto | null> {
  const doc = await TripPositionModel.findOne({ booking: bookingId }).lean<LeanPosition | null>();
  if (!doc) {
    return null;
  }
  return toPositionDto(bookingId, doc);
}

export async function upsertLatestPosition(
  context: TrackingBookingContext,
  input: TrackingLocationInput,
  now = Date.now(),
): Promise<TrackingPositionDto> {
  try {
    const doc = await TripPositionModel.findOneAndUpdate(
      { booking: context.bookingId },
      {
        $set: {
          vehicle: context.vehicleId,
          vendor: context.vendorId,
          point: toGeoPoint(input.longitude, input.latitude),
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
          heading: input.heading,
          speed: input.speed,
          recordedAt: input.recordedAt,
          source: "geolocation",
          expiresAt: new Date(now + TRACKING_POSITION_TTL_MS),
        },
        $setOnInsert: {
          booking: context.bookingId,
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).lean<LeanPosition>();
    if (!doc) {
      throw new TrackingHttpError(500, "INVALID_LOCATION", "Could not store position");
    }
    return toPositionDto(context.bookingId, doc);
  } catch (error) {
    if (error instanceof TrackingHttpError) {
      throw error;
    }
    console.error("Trip position upsert failed", { message: sanitizeDbError(error) });
    throw new TrackingHttpError(500, "INVALID_LOCATION", "Could not store position");
  }
}
