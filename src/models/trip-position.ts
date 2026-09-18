import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";
import { geoPointSchema } from "@/models/shared";
import type { GeoPoint } from "@/lib/geo/types";

export const TRACKING_SOURCES = ["geolocation"] as const;
export type TrackingSource = (typeof TRACKING_SOURCES)[number];

export interface TripPosition {
  booking: Types.ObjectId;
  vehicle: Types.ObjectId;
  vendor: Types.ObjectId;
  point: GeoPoint;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  recordedAt: Date;
  source: TrackingSource;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripPositionDocument extends TripPosition {
  _id: Types.ObjectId;
}

const tripPositionSchema = new Schema<TripPositionDocument>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    point: { type: geoPointSchema, required: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, min: 0, max: 5000 },
    heading: { type: Number, min: 0, max: 360 },
    speed: { type: Number, min: 0, max: 90 },
    recordedAt: { type: Date, required: true },
    source: {
      type: String,
      required: true,
      enum: TRACKING_SOURCES,
      default: "geolocation",
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "trip_positions" },
);

tripPositionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tripPositionSchema.index({ vehicle: 1, recordedAt: -1 });
tripPositionSchema.index({ "point": "2dsphere" });

export const TripPositionModel: Model<TripPositionDocument> =
  (models.TripPosition as Model<TripPositionDocument> | undefined) ??
  model<TripPositionDocument>("TripPosition", tripPositionSchema);
