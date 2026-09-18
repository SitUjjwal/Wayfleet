import { describe, expect, it } from "vitest";
import { authTestPayload } from "@/server/auth/test-endpoint";
import type { SessionUser } from "@/server/auth/types";

const customer: SessionUser = {
  id: "507f1f77bcf86cd799439011",
  role: "customer",
  status: "active",
};

describe("/api/auth/test contract", () => {
  it("returns 401 when unauthenticated", () => {
    const result = authTestPayload(null);
    expect(result.status).toBe(401);
    expect(result.body.ok).toBe(false);
    expect(JSON.stringify(result.body)).not.toContain("password");
  });

  it("returns 200 when authenticated without a role filter", () => {
    const result = authTestPayload(customer);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      user: { id: customer.id, role: "customer" },
    });
  });

  it("returns 200 for the correct role and 403 for the wrong role", () => {
    expect(authTestPayload(customer, "customer").status).toBe(200);
    expect(authTestPayload(customer, "vendor").status).toBe(403);
    expect(authTestPayload(customer, "admin").status).toBe(403);
    expect(
      authTestPayload({ ...customer, role: "vendor" }, "admin").status,
    ).toBe(403);
    expect(
      authTestPayload({ ...customer, role: "admin" }, "admin").status,
    ).toBe(200);
  });
});
