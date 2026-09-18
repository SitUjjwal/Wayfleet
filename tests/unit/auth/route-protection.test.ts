import { describe, expect, it } from "vitest";
import { getAuthFailure, roleForPath, type SessionUser } from "@/server/auth/types";

const customer: SessionUser = {
  id: "507f1f77bcf86cd799439011",
  role: "customer",
  status: "active",
};

describe("dashboard route protection", () => {
  it("protects customer, vendor, and admin prefixes including nested pages", () => {
    expect(roleForPath("/customer")).toBe("customer");
    expect(roleForPath("/customer/profile")).toBe("customer");
    expect(roleForPath("/vendor")).toBe("vendor");
    expect(roleForPath("/vendor/vehicles")).toBe("vendor");
    expect(roleForPath("/admin")).toBe("admin");
    expect(roleForPath("/vehicles")).toBeNull();
  });

  it("keeps role isolation on nested vendor and admin paths", () => {
    expect(getAuthFailure(customer, ["customer"])).toBeNull();
    expect(getAuthFailure(customer, ["vendor"])).toBe(403);
    expect(getAuthFailure(customer, ["admin"])).toBe(403);
    expect(
      getAuthFailure({ ...customer, role: "vendor" }, ["admin"]),
    ).toBe(403);
    expect(getAuthFailure(null, ["customer"])).toBe(401);
  });
});
