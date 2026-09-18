import type { AccountStatus, UserRole } from "@/types/domain";

export type SessionUser = {
  id: string;
  role: UserRole;
  status: AccountStatus;
  name?: string;
  email?: string;
  image?: string;
};

export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function parseUserRole(value: unknown): UserRole | null {
  if (value === "customer" || value === "vendor" || value === "admin") {
    return value;
  }
  return null;
}

export function parseAccountStatus(value: unknown): AccountStatus | null {
  if (value === "pending" || value === "active" || value === "suspended") {
    return value;
  }
  return null;
}

export function isGoogleOAuthConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.AUTH_GOOGLE_ID?.trim() && env.AUTH_GOOGLE_SECRET?.trim());
}

export function homePathForRole(role: UserRole): string {
  return `/${role}`;
}

export function roleForPath(pathname: string): UserRole | null {
  if (pathname === "/customer" || pathname.startsWith("/customer/")) {
    return "customer";
  }
  if (pathname === "/vendor" || pathname.startsWith("/vendor/")) {
    return "vendor";
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }
  return null;
}

export function safeCallbackUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  if (value.includes("://")) {
    return null;
  }
  return value;
}

export function destinationForUser(
  role: UserRole,
  callbackUrl?: string | null,
): string {
  const safe = safeCallbackUrl(callbackUrl);
  const home = homePathForRole(role);
  if (safe && (safe === home || safe.startsWith(`${home}/`))) {
    return safe;
  }
  return home;
}

export function toPublicSessionUser(input: {
  id: string;
  role: UserRole;
  status: AccountStatus;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  passwordHash?: string;
}): SessionUser {
  return {
    id: input.id,
    role: input.role,
    status: input.status,
    ...(input.name ? { name: input.name } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.image ? { image: input.image } : {}),
  };
}

export function getAuthFailure(
  user: SessionUser | null,
  requiredRoles?: readonly UserRole[],
): 401 | 403 | null {
  if (!user || user.status === "suspended") {
    return 401;
  }
  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return 403;
  }
  return null;
}
