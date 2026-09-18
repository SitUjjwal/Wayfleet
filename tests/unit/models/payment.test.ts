import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { PaymentModel } from "@/models/payment";
import { validationError } from "./validate";

function validPayment() {
  return {
    booking: new mongoose.Types.ObjectId(),
    customer: new mongoose.Types.ObjectId(),
    vendor: new mongoose.Types.ObjectId(),
    amount: 250000,
  };
}

describe("Payment model", () => {
  it("accepts a valid local payment record without a live provider", async () => {
    const payment = new PaymentModel(validPayment());
    await expect(payment.validate()).resolves.toBeUndefined();
    expect(payment.provider).toBe("none");
    expect(payment.status).toBe("created");
    expect(payment.currency).toBe("INR");
    expect(PaymentModel.schema.path("booking").options.ref).toBe("Booking");
    expect(PaymentModel.schema.path("booking").options.unique).toBe(true);
    expect(PaymentModel.schema.path("providerSignature")).toBeDefined();
    expect(PaymentModel.schema.path("paidAt")).toBeDefined();
    expect(PaymentModel.schema.path("status").options.enum).toContain("paid");
    expect(PaymentModel.schema.path("status").options.enum).not.toContain("captured");
  });

  it("accepts Razorpay provider fields and the paid status", async () => {
    const payment = new PaymentModel({
      ...validPayment(),
      provider: "razorpay",
      providerOrderId: "order_test",
      providerPaymentId: "pay_test",
      providerSignature: "sig_test",
      status: "paid",
      paidAt: new Date("2026-09-09T10:05:00.000Z"),
    });
    await expect(payment.validate()).resolves.toBeUndefined();
  });

  it("requires booking, customer, vendor, and amount", async () => {
    const error = await validationError(new PaymentModel({}));
    expect(error?.errors.booking).toBeDefined();
    expect(error?.errors.customer).toBeDefined();
    expect(error?.errors.vendor).toBeDefined();
    expect(error?.errors.amount).toBeDefined();
  });

  it("rejects unknown providers and fractional amounts", async () => {
    const error = await validationError(
      new PaymentModel({
        ...validPayment(),
        amount: 12.34,
        provider: "stripe",
        status: "charged",
      }),
    );
    expect(error?.errors.amount).toBeDefined();
    expect(error?.errors.provider).toBeDefined();
    expect(error?.errors.status).toBeDefined();
  });
});
