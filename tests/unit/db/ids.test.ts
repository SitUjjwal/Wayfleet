import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { isValidObjectId, parseObjectId } from "@/lib/db/ids";

describe("ObjectId helpers", () => {
  it("accepts canonical 24-character hex ids", () => {
    const id = new mongoose.Types.ObjectId().toString();
    expect(isValidObjectId(id)).toBe(true);
    expect(parseObjectId(id).toString()).toBe(id);
  });

  it("rejects missing, short, or non-hex values", () => {
    expect(isValidObjectId(undefined)).toBe(false);
    expect(isValidObjectId("")).toBe(false);
    expect(isValidObjectId("not-an-id")).toBe(false);
    expect(isValidObjectId("zzzzzzzzzzzzzzzzzzzzzzzz")).toBe(false);
    expect(isValidObjectId("abcdefghijkl")).toBe(false);
  });

  it("throws a generic error for invalid ids", () => {
    expect(() => parseObjectId("not-an-id")).toThrow("Invalid database id");
  });
});
