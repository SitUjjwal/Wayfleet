import { describe, expect, it } from "vitest";
import { BookingHttpError } from "@/server/bookings/errors";
import { parseBookingCreateBody, parseBookingPatchBody } from "@/server/bookings/input";

const NOW = new Date("2026-09-09T08:00:00.000Z");
const VEHICLE_ID = "507f1f77bcf86cd799439011";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    vehicleId: VEHICLE_ID,
    pickup: {
      address: "Pune Airport",
      city: "Pune",
      latitude: 18.5793,
      longitude: 73.9089,
    },
    destination: {
      address: "Koregaon Park",
      city: "Pune",
      latitude: 18.5362,
      longitude: 73.8938,
    },
    startsAt: "2026-09-10T10:00:00.000Z",
    endsAt: "2026-09-11T10:00:00.000Z",
    ...overrides,
  };
}

function expectStatus(run: () => unknown, status: number) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(BookingHttpError);
    expect((error as BookingHttpError).status).toBe(status);
    return error as BookingHttpError;
  }
  throw new Error(`expected BookingHttpError ${status}`);
}

describe("booking input", () => {
  it("accepts a valid create payload", () => {
    const parsed = parseBookingCreateBody(validBody(), NOW);
    expect(parsed.vehicleId).toBe(VEHICLE_ID);
    expect(parsed.pickup.label).toBe("Pune Airport");
    expect(parsed.endsAt.getTime()).toBeGreaterThan(parsed.startsAt.getTime());
  });

  it("rejects invalid ids, inverted dates, past starts, and long windows", () => {
    expectStatus(() => parseBookingCreateBody(validBody({ vehicleId: "nope" }), NOW), 400);
    expectStatus(
      () =>
        parseBookingCreateBody(
          validBody({
            startsAt: "2026-09-12T10:00:00.000Z",
            endsAt: "2026-09-11T10:00:00.000Z",
          }),
          NOW,
        ),
      422,
    );
    expectStatus(
      () =>
        parseBookingCreateBody(
          validBody({ startsAt: "2026-09-01T10:00:00.000Z" }),
          NOW,
        ),
      422,
    );
    expectStatus(
      () =>
        parseBookingCreateBody(
          validBody({ endsAt: "2026-10-20T10:00:00.000Z" }),
          NOW,
        ),
      422,
    );
  });

  it("rejects client ownership, amount, and status overrides", () => {
    expectStatus(
      () => parseBookingCreateBody(validBody({ customerId: "507f1f77bcf86cd799439099" }), NOW),
      422,
    );
    expectStatus(
      () => parseBookingCreateBody(validBody({ vendorId: "507f1f77bcf86cd799439099" }), NOW),
      422,
    );
    expectStatus(() => parseBookingCreateBody(validBody({ amount: 1 }), NOW), 422);
    expectStatus(
      () => parseBookingCreateBody(validBody({ bookingStatus: "confirmed" }), NOW),
      422,
    );
    expectStatus(
      () => parseBookingCreateBody(validBody({ paymentStatus: "paid" }), NOW),
      422,
    );
    expectStatus(() => parseBookingPatchBody({ action: "cancel", amount: 9 }), 422);
  });

  it("rejects string-only and invalid booking locations", () => {
    expectStatus(
      () => parseBookingCreateBody(validBody({ pickup: "Pune Airport" }), NOW),
      422,
    );
    expectStatus(
      () =>
        parseBookingCreateBody(
          validBody({
            destination: { address: "Mumbai", latitude: 19, longitude: 200 },
          }),
          NOW,
        ),
      422,
    );
  });

  it("parses allowlisted actions", () => {
    expect(parseBookingPatchBody({ action: "confirm" }).action).toBe("confirm");
    expectStatus(() => parseBookingPatchBody({ action: "explode" }), 422);
  });
});
