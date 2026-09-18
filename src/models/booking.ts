import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  BOOKING_STATUSES,
  DEFAULT_CURRENCY,
  PAYMENT_STATUSES,
  PRICING_UNITS,
  USER_ROLES,
  type BookingStatus,
  type PaymentStatus,
  type PricingUnit,
  type UserRole,
} from "@/types/domain";
import { CURRENCY_PATTERN, isIntegerMinorUnit, locationSchema } from "@/models/shared";

export interface BookingLocation {
  label: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  point?: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface BookingSnapshot {
  vehicleDisplayName: string;
  vendorBusinessName: string;
  unitAmount: number;
  currency: string;
  unit: PricingUnit;
}

export interface BookingCancellation {
  cancelledAt: Date;
  cancelledBy: Types.ObjectId;
  cancelledByRole: UserRole;
  reason?: string;
}

export interface Booking {
  customer: Types.ObjectId;
  vendor: Types.ObjectId;
  vehicle: Types.ObjectId;
  pickupLocation: BookingLocation;
  destination: BookingLocation;
  startsAt: Date;
  endsAt: Date;
  amount: number;
  currency: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  snapshot: BookingSnapshot;
  cancellation?: BookingCancellation;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingDocument extends Booking {
  _id: Types.ObjectId;
}

const snapshotSchema = new Schema<BookingSnapshot>(
  {
    vehicleDisplayName: { type: String, required: true, trim: true, maxlength: 180 },
    vendorBusinessName: { type: String, required: true, trim: true, maxlength: 160 },
    unitAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isIntegerMinorUnit,
        message: "snapshot.unitAmount must be a non-negative integer in minor units",
      },
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: CURRENCY_PATTERN,
    },
    unit: { type: String, required: true, enum: PRICING_UNITS },
  },
  { _id: false },
);

const cancellationSchema = new Schema<BookingCancellation>(
  {
    cancelledAt: { type: Date, required: true },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cancelledByRole: { type: String, required: true, enum: USER_ROLES },
    reason: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const bookingSchema = new Schema<BookingDocument>(
  {
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
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    pickupLocation: { type: locationSchema, required: true },
    destination: { type: locationSchema, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
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
    bookingStatus: {
      type: String,
      required: true,
      enum: BOOKING_STATUSES,
      default: "pending",
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: PAYMENT_STATUSES,
      default: "unpaid",
    },
    snapshot: { type: snapshotSchema, required: true },
    cancellation: { type: cancellationSchema },
  },
  { timestamps: true, collection: "bookings" },
);

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ vendor: 1, bookingStatus: 1 });
bookingSchema.index({ startsAt: 1, bookingStatus: 1 });
bookingSchema.index({ vehicle: 1, startsAt: 1, endsAt: 1, bookingStatus: 1 });

export const BookingModel: Model<BookingDocument> =
  (models.Booking as Model<BookingDocument> | undefined) ??
  model<BookingDocument>("Booking", bookingSchema);
