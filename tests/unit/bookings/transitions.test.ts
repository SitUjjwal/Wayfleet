import { describe, expect, it } from "vitest";
import {
  resolveBookingTransition,
  isBlockingBookingStatus,
} from "@/lib/booking/transitions";

describe("booking state machine", () => {
  it("allows the documented vendor and customer transitions", () => {
    expect(resolveBookingTransition("pending", "confirm", "vendor")).toBe("confirmed");
    expect(resolveBookingTransition("pending", "reject", "vendor")).toBe("rejected");
    expect(resolveBookingTransition("pending", "cancel", "customer")).toBe("cancelled");
    expect(resolveBookingTransition("confirmed", "start", "vendor")).toBe("in_progress");
    expect(resolveBookingTransition("confirmed", "cancel", "customer")).toBe("cancelled");
    expect(resolveBookingTransition("in_progress", "complete", "vendor")).toBe(
      "completed",
    );
  });

  it("rejects invalid transitions", () => {
    expect(() => resolveBookingTransition("completed", "cancel", "customer")).toThrow();
    expect(() => resolveBookingTransition("rejected", "complete", "vendor")).toThrow();
    expect(() => resolveBookingTransition("cancelled", "start", "vendor")).toThrow();
    expect(() => resolveBookingTransition("pending", "confirm", "customer")).toThrow();
    expect(() => resolveBookingTransition("completed", "confirm", "vendor")).toThrow();
  });

  it("treats only pending, confirmed, and in-progress as blocking", () => {
    expect(isBlockingBookingStatus("pending")).toBe(true);
    expect(isBlockingBookingStatus("confirmed")).toBe(true);
    expect(isBlockingBookingStatus("in_progress")).toBe(true);
    expect(isBlockingBookingStatus("rejected")).toBe(false);
    expect(isBlockingBookingStatus("cancelled")).toBe(false);
    expect(isBlockingBookingStatus("completed")).toBe(false);
  });
});
