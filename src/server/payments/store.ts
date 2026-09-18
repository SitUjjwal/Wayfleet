import "server-only";

import type { Types } from "mongoose";
import { connectDb, isMongoConfigured } from "@/lib/db";
import { sanitizeDbError } from "@/lib/db/connect";
import { BookingModel, type Booking } from "@/models/booking";
import { PaymentModel, type Payment } from "@/models/payment";
import { VendorModel } from "@/models/vendor";
import { PaymentHttpError } from "@/server/payments/errors";
import type {
  BookingPaymentView,
  PaymentPatch,
  PaymentRecord,
  PaymentRecord as StoredPayment,
  PaymentStore,
  PaymentWrite,
} from "@/server/payments/types";
import type { PaymentRecordStatus, PaymentStatus } from "@/types/domain";

type LeanBooking = Booking & { _id: Types.ObjectId };
type LeanPayment = Payment & { _id: Types.ObjectId };

export function requireMongoForPayments(): void {
  if (!isMongoConfigured()) {
    throw new PaymentHttpError(503, "Database unavailable");
  }
}

function toBookingView(doc: LeanBooking): BookingPaymentView {
  return {
    id: doc._id.toString(),
    customerId: doc.customer.toString(),
    vendorId: doc.vendor.toString(),
    amount: doc.amount,
    currency: doc.currency,
    bookingStatus: doc.bookingStatus,
    paymentStatus: doc.paymentStatus,
  };
}

function toPaymentRecord(doc: LeanPayment): PaymentRecord {
  return {
    id: doc._id.toString(),
    bookingId: doc.booking.toString(),
    customerId: doc.customer.toString(),
    vendorId: doc.vendor.toString(),
    amount: doc.amount,
    currency: doc.currency,
    provider: doc.provider,
    ...(doc.providerOrderId ? { providerOrderId: doc.providerOrderId } : {}),
    ...(doc.providerPaymentId ? { providerPaymentId: doc.providerPaymentId } : {}),
    ...(doc.providerSignature ? { providerSignature: doc.providerSignature } : {}),
    ...(doc.failureCode ? { failureCode: doc.failureCode } : {}),
    status: doc.status,
    ...(doc.paidAt ? { paidAt: doc.paidAt } : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function applyPatchToMongo(
  patch: PaymentPatch,
  unset?: Array<"providerPaymentId" | "providerSignature" | "failureCode" | "paidAt">,
) {
  const $set: Record<string, unknown> = {};
  if (patch.provider !== undefined) $set.provider = patch.provider;
  if (patch.providerOrderId !== undefined) $set.providerOrderId = patch.providerOrderId;
  if (patch.providerPaymentId !== undefined) $set.providerPaymentId = patch.providerPaymentId;
  if (patch.providerSignature !== undefined) $set.providerSignature = patch.providerSignature;
  if (patch.failureCode !== undefined) $set.failureCode = patch.failureCode;
  if (patch.status !== undefined) $set.status = patch.status;
  if (patch.paidAt !== undefined) $set.paidAt = patch.paidAt;
  if (patch.amount !== undefined) $set.amount = patch.amount;
  if (patch.currency !== undefined) $set.currency = patch.currency;

  const update: { $set?: Record<string, unknown>; $unset?: Record<string, 1> } = {};
  if (Object.keys($set).length > 0) {
    update.$set = $set;
  }
  if (unset && unset.length > 0) {
    update.$unset = Object.fromEntries(unset.map((key) => [key, 1 as const]));
  }
  return update;
}

export const mongoPaymentStore: PaymentStore = {
  async getBooking(id) {
    await connectDb();
    const doc = await BookingModel.findById(id).lean<LeanBooking | null>();
    return doc ? toBookingView(doc) : null;
  },

  async getVendorIdForUser(userId) {
    await connectDb();
    const vendor = await VendorModel.findOne({ user: userId }).select("_id");
    return vendor ? vendor._id.toString() : null;
  },

  async getPaymentByBooking(bookingId) {
    await connectDb();
    const doc = await PaymentModel.findOne({ booking: bookingId })
      .select("+providerSignature")
      .lean<LeanPayment | null>();
    return doc ? toPaymentRecord(doc) : null;
  },

  async getPaymentByOrderId(orderId) {
    await connectDb();
    const doc = await PaymentModel.findOne({ providerOrderId: orderId })
      .select("+providerSignature")
      .lean<LeanPayment | null>();
    return doc ? toPaymentRecord(doc) : null;
  },

  async getPaymentById(id) {
    await connectDb();
    const doc = await PaymentModel.findById(id)
      .select("+providerSignature")
      .lean<LeanPayment | null>();
    return doc ? toPaymentRecord(doc) : null;
  },

  async insertPayment(input: PaymentWrite) {
    await connectDb();
    try {
      const created = await PaymentModel.create({
        booking: input.bookingId,
        customer: input.customerId,
        vendor: input.vendorId,
        amount: input.amount,
        currency: input.currency,
        provider: input.provider,
        providerOrderId: input.providerOrderId,
        providerPaymentId: input.providerPaymentId,
        providerSignature: input.providerSignature,
        failureCode: input.failureCode,
        status: input.status,
        paidAt: input.paidAt,
      });
      return toPaymentRecord(created.toObject() as LeanPayment);
    } catch (error) {
      console.error("Payment insert failed", { message: sanitizeDbError(error) });
      throw error;
    }
  },

  async updatePayment(
    id,
    patch,
    options?: {
      expectedStatuses?: PaymentRecordStatus[];
      unset?: Array<
        "providerPaymentId" | "providerSignature" | "failureCode" | "paidAt"
      >;
    },
  ): Promise<StoredPayment | null> {
    await connectDb();
    const filter: Record<string, unknown> = { _id: id };
    if (options?.expectedStatuses?.length) {
      filter.status = { $in: options.expectedStatuses };
    }
    const update = applyPatchToMongo(patch, options?.unset);
    if (!update.$set && !update.$unset) {
      const current = await PaymentModel.findById(id)
        .select("+providerSignature")
        .lean<LeanPayment | null>();
      return current ? toPaymentRecord(current) : null;
    }
    const doc = await PaymentModel.findOneAndUpdate(filter, update, {
      new: true,
    })
      .select("+providerSignature")
      .lean<LeanPayment | null>();
    return doc ? toPaymentRecord(doc) : null;
  },

  async updateBookingPaymentStatus(bookingId, status: PaymentStatus) {
    await connectDb();
    const result = await BookingModel.updateOne(
      { _id: bookingId },
      { $set: { paymentStatus: status } },
    );
    if (result.matchedCount === 0) {
      throw new PaymentHttpError(500, "Internal server error");
    }
  },
};
