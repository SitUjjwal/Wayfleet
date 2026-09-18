import { afterEach, describe, expect, it } from "vitest";
import {
  getMongoUri,
  isMongoConfigured,
  redactMongoUri,
  requireMongoUri,
  sanitizeDbError,
} from "@/lib/db/config";

const originalUri = process.env.MONGODB_URI;

afterEach(() => {
  if (originalUri === undefined) {
    delete process.env.MONGODB_URI;
  } else {
    process.env.MONGODB_URI = originalUri;
  }
});

describe("MongoDB env helpers", () => {
  it("treats missing and blank MONGODB_URI as unconfigured", () => {
    delete process.env.MONGODB_URI;
    expect(isMongoConfigured()).toBe(false);
    expect(getMongoUri()).toBeUndefined();

    process.env.MONGODB_URI = "   ";
    expect(isMongoConfigured()).toBe(false);
  });

  it("reads a trimmed URI from the server env", () => {
    process.env.MONGODB_URI = "  mongodb://localhost:27017/wayfleet  ";
    expect(isMongoConfigured()).toBe(true);
    expect(getMongoUri()).toBe("mongodb://localhost:27017/wayfleet");
  });

  it("throws a secret-free error when the URI is required but missing", () => {
    delete process.env.MONGODB_URI;
    expect(() => requireMongoUri()).toThrow("MONGODB_URI is not set");
  });

  it("redacts credentials inside MongoDB URIs", () => {
    const redacted = redactMongoUri(
      "mongodb+srv://wayfleet:s3cret-pass@cluster0.mongodb.net/wayfleet",
    );
    expect(redacted).toContain("wayfleet:***@");
    expect(redacted).not.toContain("s3cret-pass");
  });

  it("strips connection strings from driver error messages", () => {
    const message = sanitizeDbError(
      new Error("failed mongodb+srv://wayfleet:s3cret@cluster0.mongodb.net/wayfleet"),
    );
    expect(message).toContain("mongodb://***");
    expect(message).not.toContain("s3cret");
  });
});
