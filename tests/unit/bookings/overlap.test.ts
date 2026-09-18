import { describe, expect, it } from "vitest";
import { rangesOverlap } from "@/lib/booking/overlap";

describe("booking overlap", () => {
  const aStart = new Date("2026-09-10T10:00:00.000Z");
  const aEnd = new Date("2026-09-10T14:00:00.000Z");

  it("detects overlapping windows", () => {
    expect(
      rangesOverlap(
        aStart,
        aEnd,
        new Date("2026-09-10T13:00:00.000Z"),
        new Date("2026-09-10T16:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("allows back-to-back bookings that only touch at the edge", () => {
    expect(
      rangesOverlap(
        aStart,
        aEnd,
        new Date("2026-09-10T14:00:00.000Z"),
        new Date("2026-09-10T16:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
