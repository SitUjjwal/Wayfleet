import { describe, expect, it } from "vitest";
import { formatMinorUnits, rupeesToMinorUnits } from "@/lib/money";

describe("money formatting", () => {
  it("formats integer minor units as whole rupees", () => {
    expect(rupeesToMinorUnits(4500)).toBe(450000);
    expect(formatMinorUnits(450000, "INR")).toContain("4,500");
  });
});
