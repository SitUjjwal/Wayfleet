import "server-only";

import { UserModel } from "@/models/user";
import { connectDb } from "@/lib/db";

export async function upsertGoogleUser(input: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  googleSubject?: string | null;
}): Promise<boolean> {
  if (!input.email) {
    return false;
  }

  await connectDb();
  const email = input.email.trim().toLowerCase();
  const existing = await UserModel.findOne({ email });

  if (existing) {
    if (existing.status === "suspended") {
      return false;
    }
    if (input.googleSubject && !existing.googleSubject) {
      existing.googleSubject = input.googleSubject;
    }
    if (input.image && !existing.profileImage) {
      existing.profileImage = input.image;
    }
    await existing.save();
    return true;
  }

  await UserModel.create({
    name: input.name?.trim() || "Google user",
    email,
    profileImage: input.image ?? undefined,
    googleSubject: input.googleSubject ?? undefined,
    role: "customer",
    status: "active",
  });

  return true;
}
