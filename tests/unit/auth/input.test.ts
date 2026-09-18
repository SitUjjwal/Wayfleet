import { describe, expect, it } from "vitest";
import {
  isAdminSelfRegistration,
  parseLoginInput,
  parseRegisterInput,
  parseRegisterRole,
} from "@/lib/validation/auth-input";

describe("authentication input", () => {
  it("rejects invalid login input with a generic error", () => {
    const result = parseLoginInput({ email: "not-an-email", password: "" });
    expect(result.data).toBeUndefined();
    expect(result.error).toBe("Invalid email or password");
  });

  it("accepts a valid login payload", () => {
    const result = parseLoginInput({
      email: "Ada@Example.com",
      password: "a-password",
    });
    expect(result.data).toEqual({
      email: "ada@example.com",
      password: "a-password",
    });
  });

  it("blocks admin self-registration", () => {
    expect(isAdminSelfRegistration("admin")).toBe(true);
    expect(parseRegisterRole("admin")).toBeNull();
    const result = parseRegisterInput({
      name: "Eve",
      email: "eve@example.com",
      password: "password12",
      confirmPassword: "password12",
      role: "admin",
    });
    expect(result.data).toBeUndefined();
    expect(result.fields?.role).toBeDefined();
  });

  it("accepts customer and vendor registration", () => {
    const customer = parseRegisterInput({
      name: "Ada",
      email: "ada@example.com",
      password: "password12",
      confirmPassword: "password12",
      role: "customer",
    });
    expect(customer.data?.role).toBe("customer");
    const vendor = parseRegisterInput({
      name: "Vend",
      email: "vend@example.com",
      password: "password12",
      confirmPassword: "password12",
      role: "vendor",
    });
    expect(vendor.data?.role).toBe("vendor");
  });

  it("rejects mismatched passwords", () => {
    const result = parseRegisterInput({
      name: "Ada",
      email: "ada@example.com",
      password: "password12",
      confirmPassword: "password99",
      role: "customer",
    });
    expect(result.data).toBeUndefined();
    expect(result.fields?.confirmPassword).toBeDefined();
  });
});
