/** @jsxImportSource react */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BookingPaymentDetails,
  paymentHeadline,
} from "@/components/booking/booking-payment-details";
import type { SafePaymentView } from "@/features/payments/types";

const payment: SafePaymentView = {
  bookingId: "507f1f77bcf86cd799439099",
  amount: 150000,
  currency: "INR",
  status: "paid",
  bookingPaymentStatus: "paid",
  provider: "razorpay",
  reference: "pay_ok",
  paidAt: "2026-09-09T10:05:00.000Z",
};

describe("booking payment UI", () => {
  it("maps payment states for the customer", () => {
    expect(paymentHeadline("unpaid")).toBe("Payment due");
    expect(paymentHeadline("pending")).toBe("Processing");
    expect(paymentHeadline("paid")).toBe("Payment successful");
    expect(paymentHeadline("failed")).toBe("Payment failed");
  });

  it("shows amount, status, date, and a safe reference for the customer", () => {
    const html = renderToStaticMarkup(
      <BookingPaymentDetails
        amount={150000}
        currency="INR"
        paymentStatus="paid"
        payment={payment}
        audience="customer"
      />,
    );
    expect(html).toContain("Payment successful");
    expect(html).toContain("pay_ok");
    expect(html).toContain('data-payment-state="paid"');
    expect(html).not.toContain("RAZORPAY_KEY_SECRET");
    expect(html).not.toContain("providerSignature");
  });

  it("hides the payment reference from vendors", () => {
    const html = renderToStaticMarkup(
      <BookingPaymentDetails
        amount={150000}
        currency="INR"
        paymentStatus="paid"
        payment={payment}
        audience="vendor"
      />,
    );
    expect(html).toContain("paid");
    expect(html).not.toContain("pay_ok");
  });
});
