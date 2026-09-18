import "server-only";

import { UserModel } from "@/models/user";
import { connectDb } from "@/lib/db";
import { parseLoginInput, loginErrorMessage } from "@/lib/validation/auth-input";
import { verifyPassword } from "@/server/auth/password";
import { toPublicSessionUser, type SessionUser } from "@/server/auth/types";

export async function authorizeCredentials(
  raw: Partial<Record<"email" | "password", unknown>>,
): Promise<SessionUser | null> {
  const parsed = parseLoginInput(raw);
  if (!parsed.data) {
    return null;
  }

  await connectDb();
  const user = await UserModel.findOne({ email: parsed.data.email }).select(
    "+passwordHash name email role status profileImage",
  );

  if (!user?.passwordHash || user.status === "suspended") {
    return null;
  }

  const matches = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!matches) {
    return null;
  }

  return toPublicSessionUser({
    id: user._id.toString(),
    role: user.role,
    status: user.status,
    name: user.name,
    email: user.email,
    image: user.profileImage,
    passwordHash: user.passwordHash,
  });
}

export function credentialsRejectionMessage(): string {
  return loginErrorMessage();
}
