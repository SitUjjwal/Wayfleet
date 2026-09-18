import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getAppHealth } from "@/app/api/health/route";
import { GET as getDbHealth } from "@/app/api/health/db/route";

const originalUri = process.env.MONGODB_URI;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalUri === undefined) {
    delete process.env.MONGODB_URI;
  } else {
    process.env.MONGODB_URI = originalUri;
  }
});

describe("health endpoints", () => {
  it("reports application health without requiring MongoDB", async () => {
    delete process.env.MONGODB_URI;
    const response = getAppHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.service).toBe("wayfleet");
    expect(body.milestone).toBe(10);
    expect(body.database.configured).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/mongodb(\+srv)?:\/\//i);
  });

  it("reports database unavailability when MONGODB_URI is missing", async () => {
    delete process.env.MONGODB_URI;
    const response = await getDbHealth();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.connected).toBe(false);
    expect(body.configured).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/mongodb(\+srv)?:\/\//i);
  });
});
