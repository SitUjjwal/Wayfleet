import "server-only";

import { connectDb } from "@/lib/db";
import { requireRazorpayKeyId } from "@/server/payments/config";
import {
  createPaymentOrder,
  findPaymentForUser,
  getPaymentForUser,
  processWebhook,
  verifyPayment,
} from "@/server/payments/core";
import { liveRazorpayGateway } from "@/server/payments/razorpay";
import { mongoPaymentStore, requireMongoForPayments } from "@/server/payments/store";
import type { PaymentActor, PaymentContext } from "@/server/payments/types";

function liveContext(): PaymentContext {
  return {
    store: mongoPaymentStore,
    gateway: liveRazorpayGateway,
    keyId: requireRazorpayKeyId(),
    now: () => new Date(),
  };
}

async function withLiveContext<T>(
  run: (ctx: PaymentContext) => Promise<T>,
): Promise<T> {
  requireMongoForPayments();
  await connectDb();
  return run(liveContext());
}

export async function createPaymentOrderForCustomer(
  user: PaymentActor,
  body: unknown,
) {
  return withLiveContext((ctx) => createPaymentOrder(ctx, user, body));
}

export async function verifyPaymentForCustomer(
  user: PaymentActor,
  body: unknown,
) {
  return withLiveContext((ctx) => verifyPayment(ctx, user, body));
}

export async function processPaymentWebhook(
  rawBody: string,
  signature: string | null,
) {
  return withLiveContext((ctx) => processWebhook(ctx, rawBody, signature));
}

export async function getSafePaymentForUser(
  user: PaymentActor,
  bookingId: string | null,
) {
  return withLiveContext((ctx) => getPaymentForUser(ctx, user, bookingId));
}

export async function findSafePaymentForUser(
  user: PaymentActor,
  bookingId: string,
) {
  return withLiveContext((ctx) => findPaymentForUser(ctx, user, bookingId));
}
