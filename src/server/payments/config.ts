import "server-only";

import { PaymentHttpError } from "@/server/payments/errors";

const KEY_ID = "RAZORPAY_KEY_ID";
const KEY_SECRET = "RAZORPAY_KEY_SECRET";
const WEBHOOK_SECRET = "RAZORPAY_WEBHOOK_SECRET";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getRazorpayKeyId(): string | undefined {
  return readEnv(KEY_ID);
}

export function getRazorpayKeySecret(): string | undefined {
  return readEnv(KEY_SECRET);
}

export function getRazorpayWebhookSecret(): string | undefined {
  return readEnv(WEBHOOK_SECRET);
}

export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
}

export function isRazorpayWebhookConfigured(): boolean {
  return Boolean(getRazorpayWebhookSecret());
}

export function requireRazorpayKeyId(): string {
  const value = getRazorpayKeyId();
  if (!value) {
    throw new PaymentHttpError(503, "Payment provider is not configured");
  }
  return value;
}

export function requireRazorpayKeySecret(): string {
  const value = getRazorpayKeySecret();
  if (!value) {
    throw new PaymentHttpError(503, "Payment provider is not configured");
  }
  return value;
}

export function requireRazorpayWebhookSecret(): string {
  const value = getRazorpayWebhookSecret();
  if (!value) {
    throw new PaymentHttpError(503, "Payment webhook is not configured");
  }
  return value;
}
