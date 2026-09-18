import { afterEach, describe, expect, it, vi } from "vitest";

const { connect } = vi.hoisted(() => ({
  connect: vi.fn(),
}));

vi.mock("mongoose", () => ({
  default: {
    connect,
    connection: {
      readyState: 0,
      db: null,
    },
  },
}));

import { connectDb, resetMongoConnectionCache } from "@/lib/db/connect";

const originalUri = process.env.MONGODB_URI;

afterEach(() => {
  resetMongoConnectionCache();
  connect.mockReset();
  if (originalUri === undefined) {
    delete process.env.MONGODB_URI;
  } else {
    process.env.MONGODB_URI = originalUri;
  }
});

describe("connectDb", () => {
  it("reuses a single in-flight connection", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/wayfleet";
    const instance = { connection: { readyState: 1 } };
    connect.mockResolvedValue(instance);

    const first = await connectDb();
    const second = await connectDb();

    expect(first).toBe(instance);
    expect(second).toBe(instance);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("clears the cache and throws a generic error when connect fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.MONGODB_URI =
      "mongodb+srv://wayfleet:s3cret@cluster0.mongodb.net/wayfleet";
    connect.mockRejectedValue(
      new Error("ECONNREFUSED mongodb+srv://wayfleet:s3cret@host"),
    );

    await expect(connectDb()).rejects.toThrow("MongoDB connection failed");
    await expect(connectDb()).rejects.toThrow("MongoDB connection failed");
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
