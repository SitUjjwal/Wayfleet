import { describe, expect, it } from "vitest";
import { calculateBookingAmount, billableUnits } from "@/lib/booking/pricing";

describe("booking price calculation", () => {
  const startsAt = new Date("2026-09-10T10:00:00.000Z");

  it("bills at least one day for a same-calendar-day window", () => {
    const endsAt = new Date("2026-09-10T16:00:00.000Z");
    expect(billableUnits("day", startsAt, endsAt)).toBe(1);
    expect(
      calculateBookingAmount({ unitAmount: 150000, unit: "day", startsAt, endsAt }),
    ).toBe(150000);
  });

  it("rounds a 25-hour window up to two days", () => {
    const endsAt = new Date("2026-09-11T11:00:00.000Z");
    expect(
      calculateBookingAmount({ unitAmount: 150000, unit: "day", startsAt, endsAt }),
    ).toBe(300000);
  });

  it("uses a flat trip fare", () => {
    const endsAt = new Date("2026-09-12T10:00:00.000Z");
    expect(
      calculateBookingAmount({ unitAmount: 500000, unit: "trip", startsAt, endsAt }),
    ).toBe(500000);
  });

  it("rounds hours up", () => {
    const endsAt = new Date("2026-09-10T11:15:00.000Z");
    expect(
      calculateBookingAmount({ unitAmount: 10000, unit: "hour", startsAt, endsAt }),
    ).toBe(20000);
  });
});
