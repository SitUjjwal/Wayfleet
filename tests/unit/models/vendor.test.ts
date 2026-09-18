import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { VendorModel } from "@/models/vendor";
import { validationError } from "./validate";

describe("Vendor model", () => {
  it("accepts a valid vendor linked to a user", async () => {
    const vendor = new VendorModel({
      user: new mongoose.Types.ObjectId(),
      businessName: "Harbor Fleet",
      contact: { email: "ops@harbor.test", phone: "+91 98765 43210" },
    });
    await expect(vendor.validate()).resolves.toBeUndefined();
    expect(vendor.kycStatus).toBe("not_started");
    expect(vendor.verificationStatus).toBe("unverified");
    expect(vendor.rating.average).toBe(0);
    expect(VendorModel.schema.path("user").options.ref).toBe("User");
  });

  it("requires a user reference and business name", async () => {
    const error = await validationError(new VendorModel({}));
    expect(error?.errors.user).toBeDefined();
    expect(error?.errors.businessName).toBeDefined();
  });

  it("rejects invalid contact email and out-of-range ratings", async () => {
    const error = await validationError(
      new VendorModel({
        user: new mongoose.Types.ObjectId(),
        businessName: "Harbor Fleet",
        contact: { email: "bad-email" },
        rating: { average: 9, count: -1 },
      }),
    );
    expect(error?.errors["contact.email"]).toBeDefined();
    expect(error?.errors["rating.average"]).toBeDefined();
    expect(error?.errors["rating.count"]).toBeDefined();
  });
});
