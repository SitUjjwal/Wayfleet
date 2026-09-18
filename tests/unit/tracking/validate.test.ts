import { describe, expect, it } from "vitest";
import { isTrackingEligible } from "@/lib/tracking/eligibility";
import { GeoValidationError } from "@/lib/geo/validate";
import { parseTrackingLocationPayload } from "@/lib/tracking/validate";
import { TrackingRateLimiter } from "@/server/tracking/rate-limit";

const bookingId = "507f1f77bcf86cd799439099";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    bookingId,
    latitude: 18.5204,
    longitude: 73.8567,
    recordedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("tracking eligibility", () => {
  it("allows confirmed and in_progress only", () => {
    expect(isTrackingEligible("confirmed")).toBe(true);
    expect(isTrackingEligible("in_progress")).toBe(true);
    expect(isTrackingEligible("pending")).toBe(false);
    expect(isTrackingEligible("rejected")).toBe(false);
    expect(isTrackingEligible("cancelled")).toBe(false);
    expect(isTrackingEligible("completed")).toBe(false);
  });
});

describe("tracking location payload", () => {
  it("accepts a valid GPS payload", () => {
    const parsed = parseTrackingLocationPayload(validPayload({ accuracy: 12, speed: 8, heading: 90 }));
    expect(parsed.latitude).toBe(18.5204);
    expect(parsed.longitude).toBe(73.8567);
    expect(parsed.accuracy).toBe(12);
  });

  it("rejects invalid, out-of-range, NaN, and infinite coordinates", () => {
    expect(() => parseTrackingLocationPayload(validPayload({ latitude: 91 }))).toThrow(
      GeoValidationError,
    );
    expect(() => parseTrackingLocationPayload(validPayload({ latitude: -91 }))).toThrow(
      GeoValidationError,
    );
    expect(() => parseTrackingLocationPayload(validPayload({ longitude: 181 }))).toThrow(
      GeoValidationError,
    );
    expect(() => parseTrackingLocationPayload(validPayload({ longitude: -181 }))).toThrow(
      GeoValidationError,
    );
    expect(() => parseTrackingLocationPayload(validPayload({ latitude: Number.NaN }))).toThrow(
      GeoValidationError,
    );
    expect(() =>
      parseTrackingLocationPayload(validPayload({ longitude: Number.POSITIVE_INFINITY })),
    ).toThrow(GeoValidationError);
  });

  it("rejects invalid accuracy, speed, timestamps, and operators", () => {
    expect(() => parseTrackingLocationPayload(validPayload({ accuracy: -1 }))).toThrow(
      GeoValidationError,
    );
    expect(() => parseTrackingLocationPayload(validPayload({ accuracy: 9000 }))).toThrow(
      GeoValidationError,
    );
    expect(() => parseTrackingLocationPayload(validPayload({ speed: -4 }))).toThrow(
      GeoValidationError,
    );
    expect(() => parseTrackingLocationPayload(validPayload({ speed: 120 }))).toThrow(
      GeoValidationError,
    );
    expect(() =>
      parseTrackingLocationPayload(
        validPayload({ recordedAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() }),
      ),
    ).toThrow(/future/);
    expect(() =>
      parseTrackingLocationPayload(
        validPayload({ recordedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() }),
      ),
    ).toThrow(/stale/);
    expect(() =>
      parseTrackingLocationPayload({ $near: true, bookingId, latitude: 18, longitude: 73 }),
    ).toThrow(GeoValidationError);
  });

  it("ignores client-supplied vendorId and vehicleId", () => {
    const parsed = parseTrackingLocationPayload(
      validPayload({ vendorId: "forged", vehicleId: "forged" }),
    );
    expect(parsed).not.toHaveProperty("vendorId");
    expect(parsed).not.toHaveProperty("vehicleId");
  });
});

describe("tracking rate limiter", () => {
  it("rate-limits rapid updates and skips unchanged coordinates", () => {
    const limiter = new TrackingRateLimiter(5_000);
    expect(limiter.check("a", 18.52, 73.85, 1_000)).toBe("ok");
    expect(limiter.check("a", 18.53, 73.86, 1_100)).toBe("rate_limited");
    expect(limiter.check("a", 18.52, 73.85, 7_000)).toBe("unchanged");
    expect(limiter.check("a", 18.6, 73.9, 13_000)).toBe("ok");
  });
});
