import { describe, expect, it } from "vitest";
import {
  destinationForUser,
  getAuthFailure,
  isGoogleOAuthConfigured,
  parseUserRole,
  roleForPath,
  safeCallbackUrl,
  toPublicSessionUser,
  type SessionUser,
} from "@/server/auth/types";

const customer: SessionUser = {
  id: "507f1f77bcf86cd799439011",
  role: "customer",
  status: "active",
  name: "Ada",
  email: "ada@example.com",
};

const vendor: SessionUser = { ...customer, role: "vendor" };
const admin: SessionUser = { ...customer, role: "admin" };

describe("session authorization helpers", () => {
  it("rejects unauthenticated and suspended users", () => {
    expect(getAuthFailure(null)).toBe(401);
    expect(getAuthFailure({ ...customer, status: "suspended" })).toBe(401);
  });

  it("allows an authenticated customer, vendor, or admin", () => {
    expect(getAuthFailure(customer)).toBeNull();
    expect(getAuthFailure(vendor)).toBeNull();
    expect(getAuthFailure(admin)).toBeNull();
  });

  it("allows a customer on customer resources", () => {
    expect(getAuthFailure(customer, ["customer"])).toBeNull();
  });

  it("allows a vendor on vendor resources", () => {
    expect(getAuthFailure(vendor, ["vendor"])).toBeNull();
  });

  it("allows an admin on admin resources", () => {
    expect(getAuthFailure(admin, ["admin"])).toBeNull();
  });

  it("blocks a customer from vendor resources", () => {
    expect(getAuthFailure(customer, ["vendor"])).toBe(403);
  });

  it("blocks a customer from admin resources", () => {
    expect(getAuthFailure(customer, ["admin"])).toBe(403);
  });

  it("blocks a vendor from admin resources", () => {
    expect(getAuthFailure(vendor, ["admin"])).toBe(403);
  });

  it("strips password hashes from session payloads", () => {
    const session = toPublicSessionUser({
      ...customer,
      passwordHash: "scrypt$salt$hash",
    });
    expect(session).toEqual(customer);
    expect(JSON.stringify(session)).not.toContain("password");
    expect(JSON.stringify(session)).not.toContain("scrypt");
  });
});

describe("callback URL and role paths", () => {
  it("rejects open redirects", () => {
    expect(safeCallbackUrl("https://evil.example/phish")).toBeNull();
    expect(safeCallbackUrl("//evil.example")).toBeNull();
    expect(safeCallbackUrl("\\evil")).toBeNull();
    expect(safeCallbackUrl("/customer")).toBe("/customer");
  });

  it("sends users to their own area even if callback targets another role", () => {
    expect(destinationForUser("customer", "/admin")).toBe("/customer");
    expect(destinationForUser("vendor", "/vendor/later")).toBe("/vendor/later");
  });

  it("maps protected prefixes to roles", () => {
    expect(roleForPath("/customer")).toBe("customer");
    expect(roleForPath("/vendor/jobs")).toBe("vendor");
    expect(roleForPath("/admin/users")).toBe("admin");
    expect(roleForPath("/login")).toBeNull();
  });

  it("ignores forged roles that are not in the allowlist", () => {
    expect(parseUserRole("superadmin")).toBeNull();
    expect(parseUserRole("admin")).toBe("admin");
  });

  it("treats Google OAuth as unconfigured without both env values", () => {
    expect(isGoogleOAuthConfigured({})).toBe(false);
    expect(isGoogleOAuthConfigured({ AUTH_GOOGLE_ID: "id" })).toBe(false);
    expect(
      isGoogleOAuthConfigured({ AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "secret" }),
    ).toBe(true);
  });
});
