/** @jsxImportSource react */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CustomerTrackingPanel } from "@/components/tracking/customer-tracking-panel";
import { TrackingStatusBar } from "@/components/tracking/tracking-status-bar";
import { VendorTrackingPanel } from "@/components/tracking/vendor-tracking-panel";
import { BookingDetail } from "@/components/booking/booking-detail";
import type { BookingListItem } from "@/features/bookings/types";
import type { TrackingSnapshot } from "@/features/tracking/types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/features/tracking/socket-client", () => ({
  createTrackingSocket: () => null,
  leaveTrackingRoom: vi.fn(),
  publishTrackingLocation: vi.fn(),
}));

const snapshot: TrackingSnapshot = {
  bookingId: "507f1f77bcf86cd799439099",
  bookingStatus: "in_progress",
  trackingActive: true,
  canPublish: true,
  position: {
    bookingId: "507f1f77bcf86cd799439099",
    latitude: 18.5204,
    longitude: 73.8567,
    recordedAt: "2026-09-09T12:00:00.000Z",
    source: "geolocation",
  },
};

const booking: BookingListItem = {
  id: snapshot.bookingId,
  vehicle: { id: "507f1f77bcf86cd799439013", displayName: "Toyota Etios" },
  vendor: { id: "507f1f77bcf86cd799439014", businessName: "Harbor Fleet" },
  pickup: { label: "Pune" },
  destination: { label: "Mumbai" },
  startsAt: "2026-09-10T10:00:00.000Z",
  endsAt: "2026-09-11T10:00:00.000Z",
  amount: 150000,
  currency: "INR",
  bookingStatus: "in_progress",
  paymentStatus: "paid",
  snapshot: {
    vehicleDisplayName: "Toyota Etios",
    vendorBusinessName: "Harbor Fleet",
    unitAmount: 150000,
    currency: "INR",
    unit: "day",
  },
  createdAt: "2026-09-09T08:00:00.000Z",
};

describe("tracking UI", () => {
  it("renders connection and GPS sharing states", () => {
    const html = renderToStaticMarkup(
      <TrackingStatusBar
        connection="connected"
        trackingActive
        sharing
        lastUpdated={snapshot.position?.recordedAt}
        error="Location permission was denied."
      />,
    );
    expect(html).toContain("Connected");
    expect(html).toContain("On");
    expect(html).toContain("Location permission was denied.");
    expect(html).toContain('role="alert"');
  });

  it("shows vendor start/stop controls and customer read-only tracking", () => {
    const vendor = renderToStaticMarkup(
      <VendorTrackingPanel
        bookingId={snapshot.bookingId}
        vehicleName="Toyota Etios"
        initial={snapshot}
      />,
    );
    expect(vendor).toContain("Start sharing");
    expect(vendor).toContain("data-vendor-tracking");

    const customer = renderToStaticMarkup(
      <CustomerTrackingPanel
        bookingId={snapshot.bookingId}
        vehicleName="Toyota Etios"
        initial={{ ...snapshot, canPublish: false }}
      />,
    );
    expect(customer).toContain("data-customer-tracking");
    expect(customer).not.toContain("Start sharing");
    expect(customer).toContain("read-only");
  });

  it("shows empty and inactive tracking states", () => {
    const empty = renderToStaticMarkup(
      <CustomerTrackingPanel
        bookingId={snapshot.bookingId}
        vehicleName="Toyota Etios"
        initial={{ ...snapshot, position: null, canPublish: false }}
      />,
    );
    expect(empty).toContain("Waiting for the vehicle");

    const inactive = renderToStaticMarkup(
      <VendorTrackingPanel
        bookingId={snapshot.bookingId}
        vehicleName="Toyota Etios"
        initial={{
          ...snapshot,
          trackingActive: false,
          canPublish: false,
          bookingStatus: "completed",
          position: null,
        }}
      />,
    );
    expect(inactive).toContain("Tracking is available for confirmed and in-progress trips");
    expect(inactive).not.toContain("Start sharing");
  });

  it("links booking detail to tracking for eligible statuses", () => {
    const html = renderToStaticMarkup(
      <BookingDetail booking={booking} audience="customer" />,
    );
    expect(html).toContain("/customer/bookings/507f1f77bcf86cd799439099/tracking");
    expect(html).toContain("Live tracking");
  });
});
