import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/server/auth/types";

vi.mock("@/lib/db", () => ({
  connectDb: vi.fn(),
  isMongoConfigured: () => true,
  isValidObjectId: (id: unknown) =>
    typeof id === "string" && /^[a-f0-9]{24}$/i.test(id),
}));

vi.mock("@/models/booking", () => ({
  BookingModel: { findById: vi.fn() },
}));

vi.mock("@/server/vendors/profile", () => ({
  requireVendorProfile: vi.fn(),
}));

vi.mock("@/server/tracking/store", () => ({
  findLatestPosition: vi.fn(),
  upsertLatestPosition: vi.fn(),
}));

import { BookingModel } from "@/models/booking";
import { findLatestPosition } from "@/server/tracking/store";
import { getTrackingSnapshotForUser } from "@/server/tracking/service";

const customer: SessionUser = {
  id: "507f1f77bcf86cd799439011",
  role: "customer",
  status: "active",
};

const bookingId = "507f1f77bcf86cd799439099";

describe("tracking snapshot privacy", () => {
  beforeEach(() => {
    vi.mocked(findLatestPosition).mockReset();
  });

  it("does not expose a stored position after tracking ends", async () => {
    vi.mocked(BookingModel.findById).mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: new mongoose.Types.ObjectId(bookingId),
          customer: new mongoose.Types.ObjectId(customer.id),
          vendor: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
          vehicle: new mongoose.Types.ObjectId("507f1f77bcf86cd799439015"),
          bookingStatus: "completed",
        }),
      }),
    } as never);
    vi.mocked(findLatestPosition).mockResolvedValue({
      bookingId,
      latitude: 18.52,
      longitude: 73.85,
      recordedAt: new Date().toISOString(),
      source: "geolocation",
    });

    const snapshot = await getTrackingSnapshotForUser(customer, bookingId);
    expect(snapshot.trackingActive).toBe(false);
    expect(snapshot.position).toBeNull();
    expect(snapshot.canPublish).toBe(false);
    expect(findLatestPosition).not.toHaveBeenCalled();
  });
});
