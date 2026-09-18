import type { BookingStatus } from "@/types/domain";

/**
 * Bookings that may start or retry a Razorpay checkout.
 *
 * Rule: payment is allowed for `pending` and `confirmed` only.
 * Vendor acceptance is not required before payment.
 * Payment success does not change bookingStatus (no pending → confirmed).
 */
export const PAYMENT_ELIGIBLE_BOOKING_STATUSES = [
  "pending",
  "confirmed",
] as const satisfies readonly BookingStatus[];

export type PaymentEligibleBookingStatus =
  (typeof PAYMENT_ELIGIBLE_BOOKING_STATUSES)[number];

export function isBookingPaymentEligible(
  status: BookingStatus,
): status is PaymentEligibleBookingStatus {
  return (PAYMENT_ELIGIBLE_BOOKING_STATUSES as readonly string[]).includes(
    status,
  );
}

export function paymentIneligibleMessage(status: BookingStatus): string {
  if (status === "cancelled") {
    return "Cancelled bookings cannot be paid";
  }
  if (status === "rejected") {
    return "Rejected bookings cannot be paid";
  }
  if (status === "completed") {
    return "Completed bookings cannot be paid";
  }
  if (status === "in_progress") {
    return "In-progress bookings cannot be paid";
  }
  return "Booking is not eligible for payment";
}
