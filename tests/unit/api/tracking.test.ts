import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthHttpError } from "@/server/auth/http-error";
import { TrackingHttpError } from "@/server/tracking/errors";
import type { SessionUser } from "@/server/auth/types";

vi.mock("@/server/auth/guards", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/server/tracking/service", () => ({
  getTrackingSnapshotForUser: vi.fn(),
}));

vi.mock("@/lib/realtime/config", async () => {
  const actual = await vi.importActual<typeof import("@/lib/realtime/config")>(
    "@/lib/realtime/config",
  );
  return {
    ...actual,
    getRealtimeSecret: () => "test-realtime-secret",
  };
});

import { requireAuth } from "@/server/auth/guards";
import { getTrackingSnapshotForUser } from "@/server/tracking/service";
import { GET as GET_TOKEN } from "@/app/api/realtime/token/route";
import { GET as GET_TRACKING } from "@/app/api/tracking/[bookingId]/route";

const customer: SessionUser = {
  id: "507f1f77bcf86cd799439011",
  role: "customer",
  status: "active",
};

const snapshot = {
  bookingId: "507f1f77bcf86cd799439099",
  bookingStatus: "in_progress" as const,
  trackingActive: true,
  canPublish: false,
  position: {
    bookingId: "507f1f77bcf86cd799439099",
    latitude: 18.52,
    longitude: 73.85,
    recordedAt: "2026-09-09T12:00:00.000Z",
    source: "geolocation" as const,
  },
};

describe("tracking API", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset();
    vi.mocked(getTrackingSnapshotForUser).mockReset();
  });

  it("rejects unauthenticated latest-position access", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new AuthHttpError(401));
    const response = await GET_TRACKING(new Request("http://localhost/api/tracking/x"), {
      params: Promise.resolve({ bookingId: snapshot.bookingId }),
    });
    expect(response.status).toBe(401);
  });

  it("returns the latest position without internal Mongo fields", async () => {
    vi.mocked(requireAuth).mockResolvedValue(customer);
    vi.mocked(getTrackingSnapshotForUser).mockResolvedValue(snapshot);
    const response = await GET_TRACKING(new Request("http://localhost/api/tracking/id"), {
      params: Promise.resolve({ bookingId: snapshot.bookingId }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.position.latitude).toBe(18.52);
    expect(JSON.stringify(body)).not.toContain("_id");
    expect(JSON.stringify(body)).not.toContain("expiresAt");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("maps forbidden tracking access to 403", async () => {
    vi.mocked(requireAuth).mockResolvedValue(customer);
    vi.mocked(getTrackingSnapshotForUser).mockRejectedValue(
      new TrackingHttpError(403, "TRACKING_FORBIDDEN", "Forbidden"),
    );
    const response = await GET_TRACKING(new Request("http://localhost/api/tracking/id"), {
      params: Promise.resolve({ bookingId: snapshot.bookingId }),
    });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
    expect(body.fields.code).toBe("TRACKING_FORBIDDEN");
  });

  it("issues a realtime token for an authenticated user", async () => {
    vi.mocked(requireAuth).mockResolvedValue(customer);
    const response = await GET_TOKEN();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.token.split(".")).toHaveLength(3);
    expect(JSON.stringify(body)).not.toContain("AUTH_SECRET");
  });
});
