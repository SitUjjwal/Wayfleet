import { afterEach, describe, expect, it } from "vitest";
import { googleAuthProviders } from "@/auth.config";

const originalId = process.env.AUTH_GOOGLE_ID;
const originalSecret = process.env.AUTH_GOOGLE_SECRET;

afterEach(() => {
  if (originalId === undefined) {
    delete process.env.AUTH_GOOGLE_ID;
  } else {
    process.env.AUTH_GOOGLE_ID = originalId;
  }
  if (originalSecret === undefined) {
    delete process.env.AUTH_GOOGLE_SECRET;
  } else {
    process.env.AUTH_GOOGLE_SECRET = originalSecret;
  }
});

describe("Auth.js Google provider", () => {
  it("does not register Google without both env values", () => {
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    expect(googleAuthProviders()).toEqual([]);
  });

  it("registers Google when both env values are present", () => {
    process.env.AUTH_GOOGLE_ID = "google-client-id";
    process.env.AUTH_GOOGLE_SECRET = "google-client-secret";
    expect(googleAuthProviders()).toHaveLength(1);
  });
});
