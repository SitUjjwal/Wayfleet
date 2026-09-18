/** @jsxImportSource react */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BookingForm } from "@/components/booking/booking-form";
import { BookingActionButtons } from "@/components/booking/booking-actions";
import { BookingList } from "@/components/booking/booking-list";
import { BookingDetail } from "@/components/booking/booking-detail";
import type { BookingListItem } from "@/features/bookings/types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/maps/location-picker", () => ({
  LocationPicker: ({ label }: { label: string }) => <div>{label}</div>,
}));

const booking: BookingListItem = {
  id: "507f1f77bcf86cd799439099",
  vehicle: { id: "507f1f77bcf86cd799439013", displayName: "Toyota Etios" },
  vendor: { id: "507f1f77bcf86cd799439014", businessName: "Harbor Fleet" },
  customer: { id: "507f1f77bcf86cd799439011", name: "Ada", email: "ada@example.com" },
  pickup: { label: "Pune Airport" },
  destination: { label: "Koregaon Park" },
  startsAt: "2026-09-10T10:00:00.000Z",
  endsAt: "2026-09-11T10:00:00.000Z",
  amount: 150000,
  currency: "INR",
  bookingStatus: "pending",
  paymentStatus: "unpaid",
  snapshot: {
    vehicleDisplayName: "Toyota Etios",
    vendorBusinessName: "Harbor Fleet",
    unitAmount: 150000,
    currency: "INR",
    unit: "day",
  },
  createdAt: "2026-09-09T08:00:00.000Z",
};

describe("booking UI", () => {
  it("asks visitors to sign in before booking", () => {
    const html = renderToStaticMarkup(
      <BookingForm
        vehicleId="507f1f77bcf86cd799439013"
        vehicleName="Toyota Etios"
        unitAmount={150000}
        currency="INR"
        unit="day"
        canBook
        signedIn={false}
        isCustomer={false}
      />,
    );
    expect(html).toContain("Sign in to book");
  });

  it("shows the booking form and estimated price for a customer", () => {
    const html = renderToStaticMarkup(
      <BookingForm
        vehicleId="507f1f77bcf86cd799439013"
        vehicleName="Toyota Etios"
        unitAmount={150000}
        currency="INR"
        unit="day"
        canBook
        signedIn
        isCustomer
      />,
    );
    expect(html).toContain('data-booking-form="api"');
    expect(html).toContain("Pickup location");
    expect(html).toContain("Estimated total");
    expect(html).toContain("Review booking");
  });

  it("renders list, detail, and vendor actions", () => {
    expect(
      renderToStaticMarkup(
        <BookingList
          bookings={[]}
          hrefFor={(id) => `/customer/bookings/${id}`}
          emptyDescription="Nothing here."
        />,
      ),
    ).toContain("No bookings yet.");

    const list = renderToStaticMarkup(
      <BookingList
        bookings={[booking]}
        hrefFor={(id) => `/customer/bookings/${id}`}
        emptyDescription="Nothing here."
      />,
    );
    expect(list).toContain("Toyota Etios");
    expect(list).toContain("/customer/bookings/507f1f77bcf86cd799439099");

    const detail = renderToStaticMarkup(
      <BookingDetail booking={booking} audience="vendor" />,
    );
    expect(detail).toContain("Ada");
    expect(detail).toContain("ada@example.com");
    expect(detail).toContain("Pune Airport");
    expect(detail).toContain("Payment");
    expect(detail).toContain("unpaid");

    const actions = renderToStaticMarkup(
      <BookingActionButtons bookingId={booking.id} status="pending" audience="vendor" />,
    );
    expect(actions).toContain("Confirm");
    expect(actions).toContain("Reject");

    const customerActions = renderToStaticMarkup(
      <BookingActionButtons bookingId={booking.id} status="completed" audience="customer" />,
    );
    expect(customerActions).not.toContain("Cancel booking");
  });
});
