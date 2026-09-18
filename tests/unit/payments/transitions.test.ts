import { describe, expect, it } from "vitest";
import {
  assertPaymentTransition,
  canTransitionPayment,
} from "@/lib/payments/transitions";

describe("payment record transitions", () => {
  it("allows the documented happy path", () => {
    expect(canTransitionPayment("created", "pending")).toBe(true);
    expect(canTransitionPayment("pending", "paid")).toBe(true);
  });

  it("allows failure and retry", () => {
    expect(canTransitionPayment("created", "failed")).toBe(true);
    expect(canTransitionPayment("pending", "failed")).toBe(true);
    expect(canTransitionPayment("failed", "pending")).toBe(true);
  });

  it("keeps paid terminal except future refunds", () => {
    expect(canTransitionPayment("paid", "pending")).toBe(false);
    expect(canTransitionPayment("paid", "failed")).toBe(false);
    expect(canTransitionPayment("paid", "created")).toBe(false);
    expect(canTransitionPayment("paid", "refunded")).toBe(true);
    expect(() => assertPaymentTransition("paid", "failed")).toThrow(
      /PAYMENT_INVALID_TRANSITION/,
    );
  });
});
