import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { UserModel } from "@/models/user";
import { validationError } from "./validate";

function validUser() {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "customer" as const,
  };
}

describe("User model", () => {
  it("accepts a valid customer and defaults account status", async () => {
    const user = new UserModel(validUser());
    await expect(user.validate()).resolves.toBeUndefined();
    expect(user.status).toBe("pending");
    expect(user._id).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(UserModel.schema.path("email").options.unique).toBe(true);
    expect(UserModel.schema.path("passwordHash").options.select).toBe(false);
  });

  it("requires name, email, and a known role", async () => {
    const error = await validationError(new UserModel({}));
    expect(error?.errors.name).toBeDefined();
    expect(error?.errors.email).toBeDefined();
    expect(error?.errors.role).toBeDefined();
  });

  it("rejects invalid emails, roles, and phone numbers", async () => {
    const error = await validationError(
      new UserModel({
        name: "Ada",
        email: "not-an-email",
        role: "superadmin",
        phone: "abc",
      }),
    );
    expect(error?.errors.email).toBeDefined();
    expect(error?.errors.role).toBeDefined();
    expect(error?.errors.phone).toBeDefined();
  });
});
