import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { ReviewModel } from "@/models/review";
import { validationError } from "./validate";

function validReview() {
  return {
    customer: new mongoose.Types.ObjectId(),
    vendor: new mongoose.Types.ObjectId(),
    vehicle: new mongoose.Types.ObjectId(),
    booking: new mongoose.Types.ObjectId(),
    rating: 5,
    comment: "Clean vehicle and on time.",
  };
}

describe("Review model", () => {
  it("accepts a valid review with all references", async () => {
    const review = new ReviewModel(validReview());
    await expect(review.validate()).resolves.toBeUndefined();
    expect(ReviewModel.schema.path("customer").options.ref).toBe("User");
    expect(ReviewModel.schema.path("vendor").options.ref).toBe("Vendor");
    expect(ReviewModel.schema.path("vehicle").options.ref).toBe("Vehicle");
    expect(ReviewModel.schema.path("booking").options.ref).toBe("Booking");
    expect(ReviewModel.schema.path("booking").options.unique).toBe(true);
  });

  it("requires references and a rating", async () => {
    const error = await validationError(new ReviewModel({}));
    expect(error?.errors.customer).toBeDefined();
    expect(error?.errors.vendor).toBeDefined();
    expect(error?.errors.vehicle).toBeDefined();
    expect(error?.errors.booking).toBeDefined();
    expect(error?.errors.rating).toBeDefined();
  });

  it("rejects ratings outside 1–5 and non-integers", async () => {
    const high = await validationError(new ReviewModel({ ...validReview(), rating: 6 }));
    const zero = await validationError(new ReviewModel({ ...validReview(), rating: 0 }));
    const fraction = await validationError(
      new ReviewModel({ ...validReview(), rating: 4.5 }),
    );
    expect(high?.errors.rating).toBeDefined();
    expect(zero?.errors.rating).toBeDefined();
    expect(fraction?.errors.rating).toBeDefined();
  });
});
