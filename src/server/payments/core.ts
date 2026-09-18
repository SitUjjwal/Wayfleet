import {
  isBookingPaymentEligible,
  paymentIneligibleMessage,
} from "@/lib/payments/eligibility";
import { assertPaymentTransition } from "@/lib/payments/transitions";
import { DEFAULT_CURRENCY, type PaymentStatus } from "@/types/domain";
import type {
  CheckoutDto,
  PaymentVerifyDto,
  SafePaymentDto,
  WebhookAckDto,
} from "@/server/payments/dto";
import { PaymentHttpError } from "@/server/payments/errors";
import {
  parseCreateOrderBody,
  parsePaymentBookingQuery,
  parseVerifyBody,
} from "@/server/payments/input";
import type {
  BookingPaymentView,
  PaymentActor,
  PaymentContext,
  PaymentRecord,
} from "@/server/payments/types";

const MIN_RAZORPAY_AMOUNT = 100;

function checkoutFrom(
  ctx: PaymentContext,
  payment: PaymentRecord,
): CheckoutDto {
  if (!payment.providerOrderId) {
    throw new PaymentHttpError(500, "Internal server error");
  }
  return {
    orderId: payment.providerOrderId,
    amount: payment.amount,
    currency: payment.currency,
    keyId: ctx.keyId,
  };
}

function verifyDto(
  booking: BookingPaymentView,
  payment: PaymentRecord,
): PaymentVerifyDto {
  return {
    bookingId: booking.id,
    paymentStatus: payment.status === "paid" ? "paid" : booking.paymentStatus,
    ...(payment.providerPaymentId
      ? { reference: payment.providerPaymentId }
      : {}),
    ...(payment.paidAt ? { paidAt: payment.paidAt.toISOString() } : {}),
  };
}

function canReuseOrder(payment: PaymentRecord, booking: BookingPaymentView) {
  return (
    (payment.status === "created" || payment.status === "pending") &&
    Boolean(payment.providerOrderId) &&
    payment.amount === booking.amount &&
    payment.currency === booking.currency
  );
}

function receiptFor(bookingId: string): string {
  return `b${bookingId}${Date.now().toString(36)}`.slice(0, 40);
}

function assertCustomerOwnsBooking(
  user: PaymentActor,
  booking: BookingPaymentView,
): void {
  if (user.role !== "customer" || booking.customerId !== user.id) {
    throw new PaymentHttpError(403, "Forbidden");
  }
}

function assertPayableAmount(booking: BookingPaymentView): void {
  if (booking.currency !== DEFAULT_CURRENCY) {
    throw new PaymentHttpError(422, "Unsupported currency");
  }
  if (!Number.isInteger(booking.amount) || booking.amount < MIN_RAZORPAY_AMOUNT) {
    throw new PaymentHttpError(422, "Invalid booking amount");
  }
}

async function loadOwnedCustomerBooking(
  ctx: PaymentContext,
  user: PaymentActor,
  bookingId: string,
): Promise<BookingPaymentView> {
  const booking = await ctx.store.getBooking(bookingId);
  if (!booking) {
    throw new PaymentHttpError(404, "Booking not found");
  }
  assertCustomerOwnsBooking(user, booking);
  return booking;
}

export async function createPaymentOrder(
  ctx: PaymentContext,
  user: PaymentActor,
  body: unknown,
): Promise<CheckoutDto> {
  if (user.role !== "customer") {
    throw new PaymentHttpError(403, "Forbidden");
  }
  const { bookingId } = parseCreateOrderBody(body);
  const booking = await loadOwnedCustomerBooking(ctx, user, bookingId);

  if (!isBookingPaymentEligible(booking.bookingStatus)) {
    throw new PaymentHttpError(
      409,
      paymentIneligibleMessage(booking.bookingStatus),
    );
  }
  assertPayableAmount(booking);

  let payment = await ctx.store.getPaymentByBooking(booking.id);
  if (payment?.status === "paid") {
    throw new PaymentHttpError(409, "Booking is already paid");
  }
  if (payment && canReuseOrder(payment, booking)) {
    return checkoutFrom(ctx, payment);
  }

  let order;
  try {
    order = await ctx.gateway.createOrder({
      amount: booking.amount,
      currency: booking.currency,
      receipt: receiptFor(booking.id),
      notes: { bookingId: booking.id },
    });
  } catch (error) {
    if (error instanceof PaymentHttpError) {
      throw error;
    }
    console.error("Razorpay order create failed", { reason: "provider_unavailable" });
    throw new PaymentHttpError(502, "Payment provider unavailable");
  }

  if (order.amount !== booking.amount || order.currency !== booking.currency) {
    throw new PaymentHttpError(502, "Payment provider unavailable");
  }

  if (!payment) {
    try {
      payment = await ctx.store.insertPayment({
        bookingId: booking.id,
        customerId: booking.customerId,
        vendorId: booking.vendorId,
        amount: booking.amount,
        currency: booking.currency,
        provider: "razorpay",
        providerOrderId: order.id,
        status: "pending",
      });
    } catch {
      const existing = await ctx.store.getPaymentByBooking(booking.id);
      if (existing?.status === "paid") {
        throw new PaymentHttpError(409, "Booking is already paid");
      }
      if (existing && canReuseOrder(existing, booking)) {
        return checkoutFrom(ctx, existing);
      }
      throw new PaymentHttpError(500, "Internal server error");
    }
  } else {
    try {
      assertPaymentTransition(payment.status, "pending");
    } catch {
      throw new PaymentHttpError(409, "PAYMENT_INVALID_TRANSITION");
    }
    const updated = await ctx.store.updatePayment(
      payment.id,
      {
        provider: "razorpay",
        providerOrderId: order.id,
        status: "pending",
        amount: booking.amount,
        currency: booking.currency,
      },
      {
        expectedStatuses: ["created", "pending", "failed"],
        unset: ["providerPaymentId", "providerSignature", "failureCode", "paidAt"],
      },
    );
    if (!updated) {
      const latest = await ctx.store.getPaymentByBooking(booking.id);
      if (latest?.status === "paid") {
        throw new PaymentHttpError(409, "Booking is already paid");
      }
      throw new PaymentHttpError(409, "PAYMENT_INVALID_TRANSITION");
    }
    payment = updated;
  }

  try {
    await ctx.store.updateBookingPaymentStatus(booking.id, "pending");
  } catch {
    throw new PaymentHttpError(500, "Internal server error");
  }

  return checkoutFrom(ctx, payment);
}

export async function verifyPayment(
  ctx: PaymentContext,
  user: PaymentActor,
  body: unknown,
): Promise<PaymentVerifyDto> {
  if (user.role !== "customer") {
    throw new PaymentHttpError(403, "Forbidden");
  }
  const input = parseVerifyBody(body);
  const booking = await loadOwnedCustomerBooking(ctx, user, input.bookingId);
  const payment = await ctx.store.getPaymentByBooking(booking.id);
  if (!payment) {
    throw new PaymentHttpError(404, "Payment not found");
  }
  if (payment.providerOrderId !== input.razorpay_order_id) {
    throw new PaymentHttpError(422, "Order mismatch");
  }

  if (payment.status === "paid") {
    if (payment.providerPaymentId === input.razorpay_payment_id) {
      return verifyDto(booking, payment);
    }
    throw new PaymentHttpError(409, "Payment already completed");
  }

  let signatureOk = false;
  try {
    signatureOk = ctx.gateway.verifyPaymentSignature({
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
    });
  } catch {
    signatureOk = false;
  }

  if (!signatureOk) {
    await ctx.store.updatePayment(payment.id, {
      failureCode: "signature_invalid",
    });
    throw new PaymentHttpError(400, "Invalid payment signature");
  }

  if (ctx.gateway.fetchPayment) {
    try {
      const remote = await ctx.gateway.fetchPayment(input.razorpay_payment_id);
      if (remote) {
        if (remote.orderId && remote.orderId !== payment.providerOrderId) {
          throw new PaymentHttpError(422, "Order mismatch");
        }
        if (
          Number.isFinite(remote.amount) &&
          (remote.amount !== payment.amount || remote.currency !== payment.currency)
        ) {
          throw new PaymentHttpError(422, "Amount mismatch");
        }
      }
    } catch (error) {
      if (error instanceof PaymentHttpError) {
        throw error;
      }
    }
  }

  try {
    assertPaymentTransition(payment.status, "paid");
  } catch {
    throw new PaymentHttpError(409, "PAYMENT_INVALID_TRANSITION");
  }

  const paidAt = ctx.now();
  const updated = await ctx.store.updatePayment(
    payment.id,
    {
      status: "paid",
      providerPaymentId: input.razorpay_payment_id,
      providerSignature: input.razorpay_signature,
      paidAt,
    },
    { expectedStatuses: ["created", "pending"], unset: ["failureCode"] },
  );

  if (!updated) {
    const latest = await ctx.store.getPaymentByBooking(booking.id);
    if (latest?.status === "paid") {
      return verifyDto({ ...booking, paymentStatus: "paid" }, latest);
    }
    throw new PaymentHttpError(409, "PAYMENT_INVALID_TRANSITION");
  }

  try {
    await ctx.store.updateBookingPaymentStatus(booking.id, "paid");
  } catch {
    throw new PaymentHttpError(500, "Internal server error");
  }

  return verifyDto({ ...booking, paymentStatus: "paid" }, updated);
}

type WebhookEvent = {
  type: "paid" | "failed";
  orderId: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function extractWebhookEvent(payload: unknown): WebhookEvent | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }
  const event = typeof root.event === "string" ? root.event : "";
  const payloadNode = asRecord(root.payload);
  const paymentNode = asRecord(payloadNode?.payment);
  const entity = asRecord(paymentNode?.entity);
  const orderNode = asRecord(payloadNode?.order);
  const orderEntity = asRecord(orderNode?.entity);

  const orderId =
    (typeof entity?.order_id === "string" && entity.order_id) ||
    (typeof orderEntity?.id === "string" && orderEntity.id) ||
    "";
  const paymentId = typeof entity?.id === "string" ? entity.id : undefined;
  const amount =
    typeof entity?.amount === "number"
      ? entity.amount
      : typeof orderEntity?.amount === "number"
        ? orderEntity.amount
        : undefined;
  const currency =
    typeof entity?.currency === "string"
      ? entity.currency
      : typeof orderEntity?.currency === "string"
        ? orderEntity.currency
        : undefined;

  if (event === "payment.captured" || event === "order.paid") {
    if (!orderId) {
      return null;
    }
    return { type: "paid", orderId, paymentId, amount, currency };
  }
  if (event === "payment.failed") {
    if (!orderId) {
      return null;
    }
    return { type: "failed", orderId, paymentId, amount, currency };
  }
  return null;
}

export async function processWebhook(
  ctx: PaymentContext,
  rawBody: string,
  signature: string | null,
): Promise<WebhookAckDto> {
  if (!signature?.trim()) {
    throw new PaymentHttpError(400, "Missing webhook signature");
  }

  let signatureOk = false;
  try {
    signatureOk = ctx.gateway.verifyWebhookSignature(rawBody, signature.trim());
  } catch {
    signatureOk = false;
  }
  if (!signatureOk) {
    throw new PaymentHttpError(400, "Invalid webhook signature");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new PaymentHttpError(400, "Malformed webhook payload");
  }

  const event = extractWebhookEvent(parsed);
  if (!event) {
    return { received: true, ignored: true, reason: "unhandled_event" };
  }

  const payment = await ctx.store.getPaymentByOrderId(event.orderId);
  if (!payment) {
    return { received: true, ignored: true, reason: "unknown_payment" };
  }

  if (event.type === "paid") {
    if (payment.status === "paid") {
      return { received: true, ignored: true, reason: "already_paid" };
    }
    if (event.amount !== undefined && event.amount !== payment.amount) {
      return { received: true, ignored: true, reason: "amount_mismatch" };
    }
    if (event.currency && event.currency !== payment.currency) {
      return { received: true, ignored: true, reason: "amount_mismatch" };
    }
    try {
      assertPaymentTransition(payment.status, "paid");
    } catch {
      return { received: true, ignored: true, reason: "invalid_transition" };
    }
    const updated = await ctx.store.updatePayment(
      payment.id,
      {
        status: "paid",
        ...(event.paymentId ? { providerPaymentId: event.paymentId } : {}),
        paidAt: ctx.now(),
      },
      { expectedStatuses: ["created", "pending"], unset: ["failureCode"] },
    );
    if (updated) {
      await ctx.store.updateBookingPaymentStatus(payment.bookingId, "paid");
      return { received: true, applied: "paid" };
    }
    return { received: true, ignored: true, reason: "already_paid" };
  }

  if (payment.status === "paid") {
    return { received: true, ignored: true, reason: "already_paid" };
  }
  try {
    assertPaymentTransition(payment.status, "failed");
  } catch {
    return { received: true, ignored: true, reason: "invalid_transition" };
  }
  const updated = await ctx.store.updatePayment(
    payment.id,
    {
      status: "failed",
      failureCode: "provider_failed",
    },
    { expectedStatuses: ["created", "pending"] },
  );
  if (updated) {
    await ctx.store.updateBookingPaymentStatus(payment.bookingId, "failed");
    return { received: true, applied: "failed" };
  }
  return { received: true, ignored: true, reason: "already_paid" };
}

function toSafePaymentDto(
  booking: BookingPaymentView,
  payment: PaymentRecord,
  audience: "customer" | "vendor",
): SafePaymentDto {
  const bookingPaymentStatus: PaymentStatus =
    payment.status === "paid"
      ? "paid"
      : payment.status === "failed"
        ? "failed"
        : payment.status === "refunded"
          ? "refunded"
          : "pending";
  const dto: SafePaymentDto = {
    bookingId: booking.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    bookingPaymentStatus,
    provider: payment.provider,
  };
  if (audience === "customer") {
    const reference = payment.providerPaymentId ?? payment.providerOrderId;
    if (reference) {
      dto.reference = reference;
    }
  }
  if (payment.paidAt) {
    dto.paidAt = payment.paidAt.toISOString();
  }
  return dto;
}

export async function getPaymentForUser(
  ctx: PaymentContext,
  user: PaymentActor,
  bookingIdRaw: string | null,
): Promise<SafePaymentDto> {
  const bookingId = parsePaymentBookingQuery(bookingIdRaw);
  const booking = await ctx.store.getBooking(bookingId);
  if (!booking) {
    throw new PaymentHttpError(404, "Booking not found");
  }
  if (user.role === "customer") {
    if (booking.customerId !== user.id) {
      throw new PaymentHttpError(403, "Forbidden");
    }
  } else if (user.role === "vendor") {
    const vendorId = await ctx.store.getVendorIdForUser(user.id);
    if (!vendorId || vendorId !== booking.vendorId) {
      throw new PaymentHttpError(403, "Forbidden");
    }
  } else {
    throw new PaymentHttpError(403, "Forbidden");
  }

  const payment = await ctx.store.getPaymentByBooking(booking.id);
  if (!payment) {
    throw new PaymentHttpError(404, "Payment not found");
  }
  return toSafePaymentDto(
    booking,
    payment,
    user.role === "vendor" ? "vendor" : "customer",
  );
}

export async function findPaymentForUser(
  ctx: PaymentContext,
  user: PaymentActor,
  bookingId: string,
): Promise<SafePaymentDto | null> {
  try {
    return await getPaymentForUser(ctx, user, bookingId);
  } catch (error) {
    if (error instanceof PaymentHttpError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
