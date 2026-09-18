import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { BookingModel } from "@/models/booking";
import { validationError } from "./validate";

function validBooking() {
  return {
    customer: new mongoose.Types.ObjectId(),
    vendor: new mongoose.Types.ObjectId(),
    vehicle: new mongoose.Types.ObjectId(),
    pickupLocation: { label: "Pune Airport" },
    destination: { label: "Koregaon Park" },
    startsAt: new Date("2026-09-12T09:00:00.000Z"),
    endsAt: new Date("2026-09-13T09:00:00.000Z"),
    amount: 250000,
    snapshot: {
      vehicleDisplayName: "Toyota Innova",
      vendorBusinessName: "Harbor Fleet",
      unitAmount: 250000,
      currency: "INR",
      unit: "day" as const,
    },
  };
}

describe("Booking model", () => {
  it("accepts a valid booking and defaults statuses", async () => {
    const booking = new BookingModel(validBooking());
    await expect(booking.validate()).resolves.toBeUndefined();
    expect(booking.bookingStatus).toBe("pending");
    expect(booking.paymentStatus).toBe("unpaid");
    expect(booking.currency).toBe("INR");
    expect(BookingModel.schema.path("customer").options.ref).toBe("User");
    expect(BookingModel.schema.path("vendor").options.ref).toBe("Vendor");
    expect(BookingModel.schema.path("vehicle").options.ref).toBe("Vehicle");
  });

  it("requires the three party references, locations, window, amount, and snapshot", async () => {
    const error = await validationError(new BookingModel({}));
    expect(error?.errors.customer).toBeDefined();
    expect(error?.errors.vendor).toBeDefined();
    expect(error?.errors.vehicle).toBeDefined();
    expect(error?.errors.pickupLocation).toBeDefined();
    expect(error?.errors.destination).toBeDefined();
    expect(error?.errors.startsAt).toBeDefined();
    expect(error?.errors.endsAt).toBeDefined();
    expect(error?.errors.amount).toBeDefined();
    expect(error?.errors.snapshot).toBeDefined();
  });

  it("rejects unknown statuses and fractional amounts", async () => {
    const error = await validationError(
      new BookingModel({
        ...validBooking(),
        amount: 99.9,
        bookingStatus: "magic",
        paymentStatus: "maybe",
      }),
    );
    expect(error?.errors.amount).toBeDefined();
    expect(error?.errors.bookingStatus).toBeDefined();
    expect(error?.errors.paymentStatus).toBeDefined();
  });
});
