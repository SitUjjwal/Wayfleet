import "server-only";

import { UserModel } from "@/models/user";
import { VendorModel } from "@/models/vendor";
import { connectDb } from "@/lib/db";
import {
  parseRegisterInput,
  registerErrorMessage,
  type FieldErrors,
} from "@/lib/validation/auth-input";
import { hashPassword } from "@/server/auth/password";
import { toPublicSessionUser, type SessionUser } from "@/server/auth/types";

export type RegisterResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string; fields?: FieldErrors };

export async function registerUser(input: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  role?: unknown;
}): Promise<RegisterResult> {
  const parsed = parseRegisterInput(input);
  if (!parsed.data) {
    return { ok: false, error: parsed.error ?? registerErrorMessage(), fields: parsed.fields };
  }

  try {
    await connectDb();
    const passwordHash = await hashPassword(parsed.data.password);
    const created = await UserModel.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      status: "active",
    });

    if (parsed.data.role === "vendor") {
      try {
        await VendorModel.create({
          user: created._id,
          businessName: parsed.data.name,
          contact: { email: parsed.data.email },
          kycStatus: "not_started",
          verificationStatus: "unverified",
        });
      } catch {
        // A vendor profile is created lazily on the first vehicle API call.
      }
    }

    return {
      ok: true,
      user: toPublicSessionUser({
        id: created._id.toString(),
        role: created.role,
        status: created.status,
        name: created.name,
        email: created.email,
      }),
    };
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return { ok: false, error: registerErrorMessage() };
    }
    return { ok: false, error: registerErrorMessage() };
  }
}

function isDuplicateEmailError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}
