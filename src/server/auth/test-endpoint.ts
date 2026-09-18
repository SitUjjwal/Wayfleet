import type { SessionUser } from "@/server/auth/types";
import { getAuthFailure } from "@/server/auth/types";
import type { UserRole } from "@/types/domain";

export function authTestPayload(
  user: SessionUser | null,
  requestedRole?: string | null,
): { status: number; body: Record<string, unknown> } {
  const required =
    requestedRole === "customer" ||
    requestedRole === "vendor" ||
    requestedRole === "admin"
      ? ([requestedRole] as UserRole[])
      : undefined;

  if (requestedRole && !required) {
    return { status: 400, body: { ok: false, error: "Invalid role" } };
  }

  const failure = getAuthFailure(user, required);
  if (failure === 401) {
    return { status: 401, body: { ok: false, error: "Unauthorized" } };
  }
  if (failure === 403) {
    return { status: 403, body: { ok: false, error: "Forbidden" } };
  }

  return {
    status: 200,
    body: {
      ok: true,
      user: {
        id: user?.id,
        role: user?.role,
      },
    },
  };
}
