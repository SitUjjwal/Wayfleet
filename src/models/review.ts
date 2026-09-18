import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";

export interface Review {
  customer: Types.ObjectId;
  vendor: Types.ObjectId;
  vehicle: Types.ObjectId;
  booking: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewDocument extends Review {
  _id: Types.ObjectId;
}

const reviewSchema = new Schema<ReviewDocument>(
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
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5, validate: {
      validator: Number.isInteger,
      message: "rating must be an integer from 1 to 5",
    } },
    comment: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true, collection: "reviews" },
);

reviewSchema.index({ vendor: 1, createdAt: -1 });
reviewSchema.index({ vehicle: 1, rating: 1 });

export const ReviewModel: Model<ReviewDocument> =
  (models.Review as Model<ReviewDocument> | undefined) ??
  model<ReviewDocument>("Review", reviewSchema);
