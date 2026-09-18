import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthHttpError } from "@/server/auth/http-error";
import type { SessionUser } from "@/server/auth/types";
import { BookingHttpError } from "@/server/bookings/errors";

vi.mock("@/server/auth/guards", () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/server/bookings/service", () => ({
  createBookingForCustomer: vi.fn(),
  listBookingsForUser: vi.fn(),
  getBookingForUser: vi.fn(),
  transitionBookingForUser: vi.fn(),
}));

import { requireAuth, requireRole } from "@/server/auth/guards";
import { GET, POST } from "@/app/api/bookings/route";
import { GET as GET_ONE, PATCH } from "@/app/api/bookings/[id]/route";
import {
  createBookingForCustomer,
  getBookingForUser,
  listBookingsForUser,
  transitionBookingForUser,
} from "@/server/bookings/service";

const customer: SessionUser = {
  id: "507f1f77bcf86cd799439011",
  role: "customer",
  status: "active",
};

const vendor: SessionUser = {
  id: "507f1f77bcf86cd799439012",
  role: "vendor",
  status: "active",
};

const booking = {
  id: "507f1f77bcf86cd799439099",
  vehicle: { id: "507f1f77bcf86cd799439013", displayName: "Toyota Etios" },
  vendor: { id: "507f1f77bcf86cd799439014", businessName: "Harbor Fleet" },
  pickup: { label: "Pune" },
  destination: { label: "Mumbai" },
  startsAt: "2026-09-10T10:00:00.000Z",
  endsAt: "2026-09-11T10:00:00.000Z",
  amount: 150000,
  currency: "INR",
  bookingStatus: "pending" as const,
  paymentStatus: "unpaid" as const,
  snapshot: {
    vehicleDisplayName: "Toyota Etios",
    vendorBusinessName: "Harbor Fleet",
    unitAmount: 150000,
    currency: "INR",
    unit: "day" as const,
  },
  createdAt: "2026-09-09T08:00:00.000Z",
};

function request(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("booking API routes", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset();
    vi.mocked(requireRole).mockReset();
    vi.mocked(createBookingForCustomer).mockReset();
    vi.mocked(getBookingForUser).mockReset();
    vi.mocked(transitionBookingForUser).mockReset();
    vi.mocked(listBookingsForUser).mockReset();
  });

  it("rejects unauthenticated create with 401", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthHttpError(401));
    const response = await POST(
      request("http://localhost/api/bookings", {
        method: "POST",
        body: JSON.stringify({ vehicleId: booking.vehicle.id }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects vendor create with 403", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthHttpError(403));
    const response = await POST(
      request("http://localhost/api/bookings", {
        method: "POST",
        body: JSON.stringify({ vehicleId: booking.vehicle.id }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("creates a booking for a customer", async () => {
    vi.mocked(requireRole).mockResolvedValue(customer);
    vi.mocked(createBookingForCustomer).mockResolvedValue(booking);
    const response = await POST(
      request("http://localhost/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: booking.vehicle.id,
          pickup: {
            address: "Pune",
            city: "Pune",
            latitude: 18.5204,
            longitude: 73.8567,
          },
          destination: {
            address: "Mumbai",
            city: "Mumbai",
            latitude: 19.076,
            longitude: 72.8777,
          },
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.amount).toBe(150000);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("hides another customer's booking", async () => {
    vi.mocked(requireAuth).mockResolvedValue(customer);
    vi.mocked(getBookingForUser).mockRejectedValue(new BookingHttpError(403, "Forbidden"));
    const response = await GET_ONE(request("http://localhost/api/bookings/507f1f77bcf86cd799439099"), {
      params: Promise.resolve({ id: "507f1f77bcf86cd799439099" }),
    });
    expect(response.status).toBe(403);
  });

  it("hides another vendor's booking", async () => {
    vi.mocked(requireAuth).mockResolvedValue(vendor);
    vi.mocked(getBookingForUser).mockRejectedValue(new BookingHttpError(403, "Forbidden"));
    const response = await GET_ONE(request("http://localhost/api/bookings/507f1f77bcf86cd799439099"), {
      params: Promise.resolve({ id: "507f1f77bcf86cd799439099" }),
    });
    expect(response.status).toBe(403);
  });

  it("rejects invalid transitions with 409", async () => {
    vi.mocked(requireAuth).mockResolvedValue(customer);
    vi.mocked(transitionBookingForUser).mockRejectedValue(
      new BookingHttpError(409, "BOOKING_INVALID_TRANSITION"),
    );
    const response = await PATCH(
      request("http://localhost/api/bookings/507f1f77bcf86cd799439099", {
        method: "PATCH",
        body: JSON.stringify({ action: "complete" }),
      }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439099" }) },
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("BOOKING_INVALID_TRANSITION");
  });

  it("lists the current user's bookings", async () => {
    vi.mocked(requireAuth).mockResolvedValue(customer);
    vi.mocked(listBookingsForUser).mockResolvedValue({
      data: [booking],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });
    const response = await GET(request("http://localhost/api/bookings?status=pending"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.pagination.total).toBe(1);
  });
});
