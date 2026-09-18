import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  VEHICLE_AVAILABILITY,
  VEHICLE_CATEGORIES,
  VEHICLE_STATUSES,
  type VehicleAvailability,
  type VehicleCategory,
  type VehicleStatus,
} from "@/types/domain";
import { locationSchema, pricingSchema } from "@/models/shared";

export interface VehicleLocation {
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

export interface VehiclePricing {
  amount: number;
  currency: string;
  unit: "hour" | "day" | "trip";
}

export interface VehicleRating {
  average: number;
  count: number;
}

export interface Vehicle {
  vendor: Types.ObjectId;
  category: VehicleCategory;
  brand: string;
  model: string;
  registrationNumber: string;
  description: string;
  images: string[];
  pricing: VehiclePricing;
  location: VehicleLocation;
  availability: VehicleAvailability;
  status: VehicleStatus;
  rating: VehicleRating;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleDocument extends Vehicle {
  _id: Types.ObjectId;
}

const vehicleSchema = new Schema<VehicleDocument>(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    category: { type: String, required: true, enum: VEHICLE_CATEGORIES },
    brand: { type: String, required: true, trim: true, maxlength: 80 },
    model: { type: String, required: true, trim: true, maxlength: 80 },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
    },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    images: {
      type: [String],
      default: [],
      validate: {
        validator(value: string[]) {
          return value.length <= 12;
        },
        message: "images cannot exceed 12 URLs",
      },
    },
    pricing: { type: pricingSchema, required: true },
    location: { type: locationSchema, required: true },
    availability: {
      type: String,
      required: true,
      enum: VEHICLE_AVAILABILITY,
      default: "unavailable",
    },
    status: {
      type: String,
      required: true,
      enum: VEHICLE_STATUSES,
      default: "draft",
    },
    rating: {
      average: { type: Number, required: true, min: 0, max: 5, default: 0 },
      count: { type: Number, required: true, min: 0, default: 0 },
    },
  },
  { timestamps: true, collection: "vehicles" },
);

vehicleSchema.index({ category: 1, status: 1, availability: 1 });
vehicleSchema.index({ "location.city": 1, status: 1 });
vehicleSchema.index({ "location.point": "2dsphere" });
vehicleSchema.index({ brand: 1, model: 1, status: 1 });
vehicleSchema.index({ "pricing.amount": 1, status: 1 });
vehicleSchema.index({ "rating.average": -1, status: 1 });

export const VehicleModel: Model<VehicleDocument> =
  (models.Vehicle as Model<VehicleDocument> | undefined) ??
  model<VehicleDocument>("Vehicle", vehicleSchema);
