import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  validatePaymentVerification,
  validateWebhookSignature,
} from "razorpay/dist/utils/razorpay-utils";
import { signPayment, signWebhook, TEST_KEY_SECRET, TEST_WEBHOOK_SECRET } from "./memory-store";

describe("Razorpay signature helpers", () => {
  it("accepts HMAC SHA256 of order_id|payment_id with the key secret", () => {
    const orderId = "order_test";
    const paymentId = "pay_test";
    const signature = signPayment(orderId, paymentId, TEST_KEY_SECRET);
    expect(
      validatePaymentVerification(
        { order_id: orderId, payment_id: paymentId },
        signature,
        TEST_KEY_SECRET,
      ),
    ).toBe(true);
    expect(
      validatePaymentVerification(
        { order_id: orderId, payment_id: paymentId },
        "deadbeef",
        TEST_KEY_SECRET,
      ),
    ).toBe(false);
  });

  it("accepts HMAC SHA256 of the raw webhook body", () => {
    const body = '{"event":"payment.captured"}';
    expect(
      validateWebhookSignature(body, signWebhook(body, TEST_WEBHOOK_SECRET), TEST_WEBHOOK_SECRET),
    ).toBe(true);
    expect(validateWebhookSignature(body, "nope", TEST_WEBHOOK_SECRET)).toBe(false);
  });

  it("does not publish the Razorpay secret as a Next public env var", () => {
    const example = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
    expect(example).toContain("RAZORPAY_KEY_ID=");
    expect(example).toContain("RAZORPAY_KEY_SECRET=");
    expect(example).toContain("RAZORPAY_WEBHOOK_SECRET=");
    expect(example).not.toContain("NEXT_PUBLIC_RAZORPAY_KEY_SECRET");
  });
});
