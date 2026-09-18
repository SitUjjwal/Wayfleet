import "server-only";

import Razorpay from "razorpay";
import {
  validatePaymentVerification,
  validateWebhookSignature,
} from "razorpay/dist/utils/razorpay-utils";
import {
  requireRazorpayKeyId,
  requireRazorpayKeySecret,
  requireRazorpayWebhookSecret,
} from "@/server/payments/config";
import type {
  RazorpayGateway,
  RazorpayOrderInput,
  RazorpayOrderResult,
  RazorpayPaymentFetch,
} from "@/server/payments/types";

function createClient() {
  return new Razorpay({
    key_id: requireRazorpayKeyId(),
    key_secret: requireRazorpayKeySecret(),
  });
}

export async function createRazorpayOrder(
  input: RazorpayOrderInput,
): Promise<RazorpayOrderResult> {
  const client = createClient();
  const order = await client.orders.create({
    amount: input.amount,
    currency: input.currency,
    receipt: input.receipt,
    notes: input.notes,
  });
  return {
    id: String(order.id),
    amount: Number(order.amount),
    currency: String(order.currency),
  };
}

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  return validatePaymentVerification(
    { order_id: input.orderId, payment_id: input.paymentId },
    input.signature,
    requireRazorpayKeySecret(),
  );
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  return validateWebhookSignature(
    rawBody,
    signature,
    requireRazorpayWebhookSecret(),
  );
}

export async function fetchRazorpayPayment(
  paymentId: string,
): Promise<RazorpayPaymentFetch | null> {
  const client = createClient();
  const payment = await client.payments.fetch(paymentId);
  if (!payment?.id) {
    return null;
  }
  return {
    id: String(payment.id),
    orderId: String(payment.order_id ?? ""),
    amount: Number(payment.amount),
    currency: String(payment.currency),
    status: String(payment.status),
  };
}

export const liveRazorpayGateway: RazorpayGateway = {
  createOrder: createRazorpayOrder,
  verifyPaymentSignature: verifyRazorpayPaymentSignature,
  verifyWebhookSignature: verifyRazorpayWebhookSignature,
  fetchPayment: fetchRazorpayPayment,
};
