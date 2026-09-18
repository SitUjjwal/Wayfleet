import { BookingActionButtons } from "@/components/booking/booking-actions";
import { BookingPaymentPanel } from "@/components/booking/booking-payment";
import { BookingPaymentDetails } from "@/components/booking/booking-payment-details";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BookingListItem } from "@/features/bookings/types";
import type { SafePaymentView } from "@/features/payments/types";
import { isBookingPaymentEligible } from "@/lib/payments/eligibility";
import { isTrackingEligible } from "@/lib/tracking/eligibility";
import { formatMinorUnits } from "@/lib/money";

export function BookingDetail({
  booking,
  audience,
  payment,
}: {
  booking: BookingListItem;
  audience: "customer" | "vendor";
  payment?: SafePaymentView | null;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Booking</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            {booking.vehicle.displayName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={booking.bookingStatus} />
          {isTrackingEligible(booking.bookingStatus) ? (
            <ButtonLink
              href={`/${audience}/bookings/${booking.id}/tracking`}
              variant="secondary"
            >
              {audience === "customer" ? "Live tracking" : "Share location"}
            </ButtonLink>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-navy">Trip</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Pickup</dt>
              <dd>{booking.pickup.label}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Destination</dt>
              <dd>{booking.destination.label}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Start</dt>
              <dd>{new Date(booking.startsAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">End</dt>
              <dd>{new Date(booking.endsAt).toLocaleString()}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="font-semibold text-navy">Parties</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Vendor</dt>
              <dd>{booking.vendor.businessName}</dd>
            </div>
            {audience === "vendor" && booking.customer ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Customer</dt>
                  <dd>{booking.customer.name}</dd>
                </div>
                {booking.customer.email ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Email</dt>
                    <dd>{booking.customer.email}</dd>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Price</dt>
              <dd>{formatMinorUnits(booking.amount, booking.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Payment</dt>
              <dd>{booking.paymentStatus}</dd>
            </div>
          </dl>
        </Card>
      </div>
      {audience === "customer" ? (
        <BookingPaymentPanel
          bookingId={booking.id}
          amount={booking.amount}
          currency={booking.currency}
          bookingStatusEligible={isBookingPaymentEligible(booking.bookingStatus)}
          paymentStatus={booking.paymentStatus}
          payment={payment}
          audience="customer"
        />
      ) : (
        <BookingPaymentDetails
          amount={booking.amount}
          currency={booking.currency}
          paymentStatus={booking.paymentStatus}
          payment={payment}
          audience="vendor"
        />
      )}
      {booking.cancellation ? (
        <Card>
          <h2 className="font-semibold text-navy">Cancellation</h2>
          <p className="mt-2 text-sm text-muted">
            Cancelled {new Date(booking.cancellation.cancelledAt).toLocaleString()}
            {booking.cancellation.reason ? ` — ${booking.cancellation.reason}` : ""}
          </p>
        </Card>
      ) : null}
      <BookingActionButtons
        bookingId={booking.id}
        status={booking.bookingStatus}
        audience={audience}
      />
    </div>
  );
}
