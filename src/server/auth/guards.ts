import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDb, isMongoConfigured } from "@/lib/db";
import { UserModel } from "@/models/user";
import type { UserRole } from "@/types/domain";
import { AuthHttpError } from "@/server/auth/http-error";
import {
  getAuthFailure,
  toPublicSessionUser,
  type SessionUser,
} from "@/server/auth/types";

export { AuthHttpError };

async function readJwtUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    return null;
  }

  return toPublicSessionUser({
    id: user.id,
    role: user.role,
    status: user.status,
    name: user.name,
    email: user.email,
    image: user.image,
  });
}

async function hydrateFromDatabase(user: SessionUser): Promise<SessionUser | null> {
  if (!isMongoConfigured()) {
    return user;
  }

  try {
    await connectDb();
    const document = await UserModel.findById(user.id).select(
      "name email role status profileImage",
    );
    if (!document) {
      return null;
    }
    return toPublicSessionUser({
      id: document._id.toString(),
      role: document.role,
      status: document.status,
      name: document.name,
      email: document.email,
      image: document.profileImage,
    });
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jwtUser = await readJwtUser();
  if (!jwtUser) {
    return null;
  }
  return hydrateFromDatabase(jwtUser);
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  const failure = getAuthFailure(user);
  if (failure) {
    throw new AuthHttpError(failure);
  }
  return user as SessionUser;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  const failure = getAuthFailure(user, roles);
  if (failure) {
    throw new AuthHttpError(failure);
  }
  return user as SessionUser;
}

export async function requirePageRole(role: UserRole, callbackUrl: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  const failure = getAuthFailure(user, [role]);
  if (failure === 401) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  if (failure === 403) {
    redirect("/forbidden");
  }
  return user as SessionUser;
}
