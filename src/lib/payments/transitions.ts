import type { PaymentRecordStatus } from "@/types/domain";

const ALLOWED_NEXT: Record<PaymentRecordStatus, readonly PaymentRecordStatus[]> =
  {
    created: ["pending", "failed"],
    pending: ["paid", "failed"],
    failed: ["pending"],
    paid: ["refunded"],
    refunded: [],
  };

export function canTransitionPayment(
  from: PaymentRecordStatus,
  to: PaymentRecordStatus,
): boolean {
  return ALLOWED_NEXT[from].includes(to);
}

export function assertPaymentTransition(
  from: PaymentRecordStatus,
  to: PaymentRecordStatus,
): void {
  if (!canTransitionPayment(from, to)) {
    throw Object.assign(new Error("PAYMENT_INVALID_TRANSITION"), {
      code: "PAYMENT_INVALID_TRANSITION",
    });
  }
}

export function isTerminalPaidStatus(status: PaymentRecordStatus): boolean {
  return status === "paid" || status === "refunded";
}
