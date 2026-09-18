import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  DEFAULT_CURRENCY,
  PAYMENT_PROVIDERS,
  PAYMENT_RECORD_STATUSES,
  type PaymentProvider,
  type PaymentRecordStatus,
} from "@/types/domain";
import { CURRENCY_PATTERN, isIntegerMinorUnit } from "@/models/shared";

export interface Payment {
  booking: Types.ObjectId;
  customer: Types.ObjectId;
  vendor: Types.ObjectId;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerSignature?: string;
  failureCode?: string;
  status: PaymentRecordStatus;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentDocument extends Payment {
  _id: Types.ObjectId;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isIntegerMinorUnit,
        message: "amount must be a non-negative integer in minor units",
      },
    },
    currency: {
      type: String,
      required: true,
      default: DEFAULT_CURRENCY,
      uppercase: true,
      match: CURRENCY_PATTERN,
    },
    provider: {
      type: String,
      required: true,
      enum: PAYMENT_PROVIDERS,
      default: "none",
    },
    providerOrderId: { type: String, trim: true, maxlength: 128 },
    providerPaymentId: { type: String, trim: true, maxlength: 128 },
    providerSignature: { type: String, trim: true, maxlength: 256, select: false },
    failureCode: { type: String, trim: true, maxlength: 64 },
    status: {
      type: String,
      required: true,
      enum: PAYMENT_RECORD_STATUSES,
      default: "created",
    },
    paidAt: { type: Date },
  },
  { timestamps: true, collection: "payments" },
);

paymentSchema.index({ status: 1, provider: 1 });
paymentSchema.index(
  { providerOrderId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { providerOrderId: { $type: "string" } } },
);
paymentSchema.index(
  { providerPaymentId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { providerPaymentId: { $type: "string" } } },
);

export const PaymentModel: Model<PaymentDocument> =
  (models.Payment as Model<PaymentDocument> | undefined) ??
  model<PaymentDocument>("Payment", paymentSchema);
