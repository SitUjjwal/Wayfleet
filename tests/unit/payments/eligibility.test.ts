import { describe, expect, it } from "vitest";
import {
  isBookingPaymentEligible,
  paymentIneligibleMessage,
} from "@/lib/payments/eligibility";
import type { BookingStatus } from "@/types/domain";

describe("payment eligibility", () => {
  it("allows pending and confirmed bookings", () => {
    expect(isBookingPaymentEligible("pending")).toBe(true);
    expect(isBookingPaymentEligible("confirmed")).toBe(true);
  });

  it.each([
    "rejected",
    "cancelled",
    "completed",
    "in_progress",
  ] satisfies BookingStatus[])("rejects %s bookings", (status) => {
    expect(isBookingPaymentEligible(status)).toBe(false);
    expect(paymentIneligibleMessage(status).length).toBeGreaterThan(0);
  });
});
