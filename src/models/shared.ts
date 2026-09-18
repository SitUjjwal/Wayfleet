import "server-only";

import { Schema } from "mongoose";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/lib/validation/patterns";
import { DEFAULT_CURRENCY, PRICING_UNITS } from "@/types/domain";

export { EMAIL_PATTERN, PHONE_PATTERN };
export const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function isIntegerMinorUnit(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export const geoPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value: number[]) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            Number.isFinite(value[0]) &&
            Number.isFinite(value[1]) &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90
          );
        },
        message: "point.coordinates must be [longitude, latitude]",
      },
    },
  },
  { _id: false },
);

export const locationSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80 },
    country: { type: String, trim: true, maxlength: 80 },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    point: { type: geoPointSchema },
  },
  { _id: false },
);

export const moneySchema = new Schema(
  {
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
  },
  { _id: false },
);

export const pricingSchema = new Schema(
  {
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
    unit: {
      type: String,
      required: true,
      enum: PRICING_UNITS,
      default: "day",
    },
  },
  { _id: false },
);
