import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrackingHttpError } from "@/server/tracking/errors";
import type { SessionUser } from "@/server/auth/types";
import type { BookingStatus } from "@/types/domain";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn(),
  isMongoConfigured: () => true,
  isValidObjectId: (id: unknown) =>
    typeof id === "string" && /^[a-f0-9]{24}$/i.test(id),
}));

vi.mock("@/models/booking", () => ({
  BookingModel: {
    findById: vi.fn(),
  },
}));

vi.mock("@/server/vendors/profile", () => ({
  requireVendorProfile: vi.fn(),
}));

import { BookingModel } from "@/models/booking";
import { requireVendorProfile } from "@/server/vendors/profile";
import {
  authorizeTrackingPublish,
  authorizeTrackingSubscribe,
} from "@/server/tracking/authorize";

const bookingId = "507f1f77bcf86cd799439099";
const customer: SessionUser = {
  id: "507f1f77bcf86cd799439011",
  role: "customer",
  status: "active",
};
const otherCustomer: SessionUser = {
  id: "507f1f77bcf86cd799439012",
  role: "customer",
  status: "active",
};
const vendorUser: SessionUser = {
  id: "507f1f77bcf86cd799439013",
  role: "vendor",
  status: "active",
};
const booking = {
  _id: new mongoose.Types.ObjectId(bookingId),
  customer: new mongoose.Types.ObjectId(customer.id),
  vendor: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
  vehicle: new mongoose.Types.ObjectId("507f1f77bcf86cd799439015"),
  bookingStatus: "in_progress" as BookingStatus,
};

function mockBooking(doc: typeof booking | null) {
  vi.mocked(BookingModel.findById).mockReturnValue({
    select: () => ({
      lean: async () => doc,
    }),
  } as never);
}

describe("tracking authorization", () => {
  beforeEach(() => {
    vi.mocked(requireVendorProfile).mockReset();
    vi.mocked(requireVendorProfile).mockResolvedValue({
      _id: booking.vendor,
    } as never);
  });

  it("lets a customer join their own eligible booking", async () => {
    mockBooking(booking);
    const context = await authorizeTrackingSubscribe(customer, bookingId);
    expect(context.vehicleId).toBe(booking.vehicle.toString());
  });

  it("rejects another customer's booking", async () => {
    mockBooking(booking);
    await expect(authorizeTrackingSubscribe(otherCustomer, bookingId)).rejects.toMatchObject({
      code: "TRACKING_FORBIDDEN",
      status: 403,
    });
  });

  it("lets the owning vendor publish and rejects another vendor", async () => {
    mockBooking(booking);
    await expect(authorizeTrackingPublish(vendorUser, bookingId)).resolves.toMatchObject({
      vendorId: booking.vendor.toString(),
    });
    vi.mocked(requireVendorProfile).mockResolvedValue({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439016"),
    } as never);
    await expect(authorizeTrackingPublish(vendorUser, bookingId)).rejects.toBeInstanceOf(
      TrackingHttpError,
    );
  });

  it("rejects customer publish, completed bookings, and invalid ids", async () => {
    mockBooking(booking);
    await expect(authorizeTrackingPublish(customer, bookingId)).rejects.toMatchObject({
      code: "TRACKING_FORBIDDEN",
    });
    mockBooking({ ...booking, bookingStatus: "completed" });
    await expect(authorizeTrackingSubscribe(customer, bookingId)).rejects.toMatchObject({
      code: "TRACKING_NOT_ACTIVE",
    });
    mockBooking({ ...booking, bookingStatus: "cancelled" });
    await expect(authorizeTrackingSubscribe(customer, bookingId)).rejects.toMatchObject({
      code: "TRACKING_NOT_ACTIVE",
    });
    await expect(authorizeTrackingSubscribe(customer, "nope")).rejects.toMatchObject({
      code: "TRACKING_INVALID_BOOKING",
    });
  });
});
