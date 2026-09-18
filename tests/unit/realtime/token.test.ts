import { describe, expect, it } from "vitest";
import {
  RealtimeTokenError,
  signRealtimeToken,
  verifyRealtimeToken,
} from "@/lib/realtime/token";

const secret = "test-realtime-secret";
const identity = {
  id: "507f1f77bcf86cd799439011",
  role: "customer" as const,
  status: "active" as const,
};

describe("realtime token", () => {
  it("signs and verifies an identity", () => {
    const token = signRealtimeToken(identity, secret, 1_700_000_000_000);
    expect(verifyRealtimeToken(token, secret, 1_700_000_000_000)).toEqual(identity);
  });

  it("rejects tampered, expired, and suspended tokens", () => {
    const token = signRealtimeToken(identity, secret, 1_700_000_000_000);
    expect(() => verifyRealtimeToken(`${token}x`, secret, 1_700_000_000_000)).toThrow(
      RealtimeTokenError,
    );
    expect(() =>
      verifyRealtimeToken(token, secret, 1_700_000_000_000 + 11 * 60 * 1000),
    ).toThrow(RealtimeTokenError);
    const suspended = signRealtimeToken(
      { ...identity, status: "suspended" },
      secret,
      1_700_000_000_000,
    );
    expect(() => verifyRealtimeToken(suspended, secret, 1_700_000_000_000)).toThrow(
      RealtimeTokenError,
    );
  });
});
