import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";

describe("password hashing", () => {
  it("hashes with scrypt and never stores the plain password", { timeout: 15_000 }, async () => {
    const password = "correct horse battery";
    const stored = await hashPassword(password);
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored).not.toContain(password);
    await expect(verifyPassword(password, stored)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", stored)).resolves.toBe(false);
  });

  it("rejects empty or malformed stored hashes without throwing", async () => {
    await expect(verifyPassword("password12", "")).resolves.toBe(false);
    await expect(verifyPassword("password12", "plaintext")).resolves.toBe(false);
    await expect(verifyPassword("password12", "bcrypt$foo$bar")).resolves.toBe(false);
  });

  it("rejects passwords that are too short", async () => {
    await expect(hashPassword("short")).rejects.toThrow("Invalid password");
  });
});
