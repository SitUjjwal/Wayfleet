import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  KYC_STATUSES,
  VERIFICATION_STATUSES,
  type KycStatus,
  type VerificationStatus,
} from "@/types/domain";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/models/shared";

export interface VendorContact {
  email?: string;
  phone?: string;
  address?: string;
}

export interface VendorRating {
  average: number;
  count: number;
}

export interface Vendor {
  user: Types.ObjectId;
  businessName: string;
  contact: VendorContact;
  kycStatus: KycStatus;
  verificationStatus: VerificationStatus;
  rating: VendorRating;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorDocument extends Vendor {
  _id: Types.ObjectId;
}

const vendorSchema = new Schema<VendorDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 160,
    },
    contact: {
      email: {
        type: String,
        lowercase: true,
        trim: true,
        maxlength: 254,
        validate: {
          validator(value: string | undefined) {
            return !value || EMAIL_PATTERN.test(value);
          },
          message: "contact.email must be a valid email",
        },
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 20,
        validate: {
          validator(value: string | undefined) {
            return !value || PHONE_PATTERN.test(value);
          },
          message: "contact.phone must be a valid phone number",
        },
      },
      address: { type: String, trim: true, maxlength: 300 },
    },
    kycStatus: {
      type: String,
      required: true,
      enum: KYC_STATUSES,
      default: "not_started",
    },
    verificationStatus: {
      type: String,
      required: true,
      enum: VERIFICATION_STATUSES,
      default: "unverified",
    },
    rating: {
      average: { type: Number, required: true, min: 0, max: 5, default: 0 },
      count: { type: Number, required: true, min: 0, default: 0 },
    },
  },
  { timestamps: true, collection: "vendors" },
);

vendorSchema.index({ verificationStatus: 1, kycStatus: 1 });
vendorSchema.index({ businessName: 1 });

export const VendorModel: Model<VendorDocument> =
  (models.Vendor as Model<VendorDocument> | undefined) ??
  model<VendorDocument>("Vendor", vendorSchema);
