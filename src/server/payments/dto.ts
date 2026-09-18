import type { PaymentProvider, PaymentRecordStatus, PaymentStatus } from "@/types/domain";

export type CheckoutDto = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

export type PaymentVerifyDto = {
  bookingId: string;
  paymentStatus: PaymentStatus;
  reference?: string;
  paidAt?: string;
};

export type SafePaymentDto = {
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  bookingPaymentStatus: PaymentStatus;
  provider: PaymentProvider;
  reference?: string;
  paidAt?: string;
};

export type WebhookAckDto = {
  received: true;
  applied?: "paid" | "failed";
  ignored?: boolean;
  reason?: string;
};

const SECRET_FRAGMENTS = [
  "RAZORPAY_KEY_SECRET",
  "key_secret",
  "keySecret",
  "webhook_secret",
  "providerSignature",
];

export function publicPaymentContainsSecrets(payload: unknown): boolean {
  const json = JSON.stringify(payload);
  return SECRET_FRAGMENTS.some((fragment) => json.includes(fragment));
}
