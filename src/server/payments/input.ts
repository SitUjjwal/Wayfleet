import { isValidObjectId } from "@/lib/db";
import { PaymentHttpError } from "@/server/payments/errors";

const FORBIDDEN_WRITE_KEYS = [
  "amount",
  "currency",
  "customer",
  "customerId",
  "vendor",
  "vendorId",
  "paymentStatus",
  "status",
  "provider",
  "providerOrderId",
  "providerPaymentId",
  "providerSignature",
  "keySecret",
  "key_secret",
  "RAZORPAY_KEY_SECRET",
  "paidAt",
  "_id",
  "id",
] as const;

export type CreateOrderInput = {
  bookingId: string;
};

export type VerifyPaymentInput = {
  bookingId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

function asBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PaymentHttpError(422, "Validation error");
  }
  return body as Record<string, unknown>;
}

export function rejectUnauthorizedPaymentFields(
  body: Record<string, unknown>,
): void {
  for (const key of FORBIDDEN_WRITE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      throw new PaymentHttpError(422, "Unauthorized field cannot be modified");
    }
  }
}

function requireString(value: unknown, field: string, max = 128): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new PaymentHttpError(422, "Validation error", {
      [field]: `Enter a valid ${field}`,
    });
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new PaymentHttpError(422, "Validation error", {
      [field]: `Keep ${field} under ${max} characters`,
    });
  }
  return trimmed;
}

function requireBookingId(value: unknown): string {
  if (typeof value !== "string" || !isValidObjectId(value)) {
    throw new PaymentHttpError(400, "Invalid booking id", {
      bookingId: "Choose a valid booking",
    });
  }
  return value;
}

export function parseCreateOrderBody(body: unknown): CreateOrderInput {
  const input = asBody(body);
  rejectUnauthorizedPaymentFields(input);
  return { bookingId: requireBookingId(input.bookingId) };
}

export function parseVerifyBody(body: unknown): VerifyPaymentInput {
  const input = asBody(body);
  rejectUnauthorizedPaymentFields(input);
  return {
    bookingId: requireBookingId(input.bookingId),
    razorpay_order_id: requireString(input.razorpay_order_id, "razorpay_order_id"),
    razorpay_payment_id: requireString(input.razorpay_payment_id, "razorpay_payment_id"),
    razorpay_signature: requireString(input.razorpay_signature, "razorpay_signature", 256),
  };
}

export function parsePaymentBookingQuery(bookingId: string | null): string {
  return requireBookingId(bookingId);
}
