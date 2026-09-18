import { describe, expect, it } from "vitest";
import { PaymentHttpError } from "@/server/payments/errors";
import {
  parseCreateOrderBody,
  parseVerifyBody,
} from "@/server/payments/input";

const bookingId = "507f1f77bcf86cd799439099";

describe("payment input", () => {
  it("accepts a booking id for create-order", () => {
    expect(parseCreateOrderBody({ bookingId })).toEqual({ bookingId });
  });

  it("rejects invalid booking ids", () => {
    expect(() => parseCreateOrderBody({ bookingId: "nope" })).toThrow(
      PaymentHttpError,
    );
    try {
      parseCreateOrderBody({ bookingId: "nope" });
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentHttpError);
      expect((error as PaymentHttpError).status).toBe(400);
    }
  });

  it("rejects client amount, vendor, and paymentStatus manipulation", () => {
    for (const body of [
      { bookingId, amount: 1 },
      { bookingId, vendorId: "507f1f77bcf86cd799439014" },
      { bookingId, paymentStatus: "paid" },
    ]) {
      expect(() => parseCreateOrderBody(body)).toThrow(/Unauthorized field/);
    }
  });

  it("parses verify fields and still rejects unauthorized writes", () => {
    expect(
      parseVerifyBody({
        bookingId,
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "sig_1",
      }),
    ).toMatchObject({ bookingId, razorpay_order_id: "order_1" });
    expect(() =>
      parseVerifyBody({
        bookingId,
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "sig_1",
        paymentStatus: "paid",
      }),
    ).toThrow(/Unauthorized field/);
  });
});
