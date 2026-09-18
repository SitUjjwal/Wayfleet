import "server-only";

import { connectDb, isMongoConfigured, isValidObjectId } from "@/lib/db";
import { isTrackingEligible } from "@/lib/tracking/eligibility";
import { BookingModel, type Booking } from "@/models/booking";
import type { SessionUser } from "@/server/auth/types";
import { TrackingHttpError } from "@/server/tracking/errors";
import { requireVendorProfile } from "@/server/vendors/profile";
import type { Types } from "mongoose";

export type TrackingBookingContext = {
  bookingId: string;
  customerId: string;
  vendorId: string;
  vehicleId: string;
  bookingStatus: Booking["bookingStatus"];
};

type LeanBooking = {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  vendor: Types.ObjectId;
  vehicle: Types.ObjectId;
  bookingStatus: Booking["bookingStatus"];
};

function requireMongoForTracking(): void {
  if (!isMongoConfigured()) {
    throw new TrackingHttpError(503, "TRACKING_INVALID_BOOKING", "Database unavailable");
  }
}

export async function loadTrackingBooking(bookingId: string): Promise<LeanBooking> {
  if (!isValidObjectId(bookingId)) {
    throw new TrackingHttpError(
      400,
      "TRACKING_INVALID_BOOKING",
      "Invalid booking id",
    );
  }
  requireMongoForTracking();
  await connectDb();
  const booking = await BookingModel.findById(bookingId)
    .select("customer vendor vehicle bookingStatus")
    .lean<LeanBooking | null>();
  if (!booking) {
    throw new TrackingHttpError(404, "TRACKING_INVALID_BOOKING", "Booking not found");
  }
  if (!booking.vehicle) {
    throw new TrackingHttpError(404, "TRACKING_INVALID_BOOKING", "Booking not found");
  }
  return booking;
}

export function toTrackingContext(booking: LeanBooking): TrackingBookingContext {
  return {
    bookingId: booking._id.toString(),
    customerId: booking.customer.toString(),
    vendorId: booking.vendor.toString(),
    vehicleId: booking.vehicle.toString(),
    bookingStatus: booking.bookingStatus,
  };
}

export async function authorizeTrackingSubscribe(
  user: SessionUser,
  bookingId: string,
): Promise<TrackingBookingContext> {
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
  const context = toTrackingContext(booking);
  if (!isTrackingEligible(context.bookingStatus)) {
    throw new TrackingHttpError(
      409,
      "TRACKING_NOT_ACTIVE",
      "Tracking is not active for this booking",
      undefined,
      context.bookingStatus,
    );
  }
  return context;
}

export async function authorizeTrackingPublish(
  user: SessionUser,
  bookingId: string,
): Promise<TrackingBookingContext> {
  if (user.role !== "vendor") {
    throw new TrackingHttpError(403, "TRACKING_FORBIDDEN", "Forbidden");
  }
  const context = await authorizeTrackingSubscribe(user, bookingId);
  return context;
}
