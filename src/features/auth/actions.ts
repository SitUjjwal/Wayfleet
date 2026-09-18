"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import {
  parseLoginInput,
  parseRegisterInput,
  loginErrorMessage,
  registerErrorMessage,
  type FieldErrors,
} from "@/lib/validation/auth-input";
import { registerUser } from "@/server/auth/register";
import { destinationForUser, safeCallbackUrl } from "@/server/auth/types";

export type AuthFormState = {
  error?: string;
  fields?: FieldErrors;
};

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseLoginInput({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.data) {
    return { error: loginErrorMessage(), fields: parsed.fields };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: loginErrorMessage() };
    }
    throw error;
  }

  const session = await auth();
  const role = session?.user?.role;
  if (!role) {
    return { error: loginErrorMessage() };
  }

  redirect(
    destinationForUser(role, safeCallbackUrl(formData.get("callbackUrl")?.toString())),
  );
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseRegisterInput({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    role: formData.get("role"),
  });
  if (!parsed.data) {
    return { error: registerErrorMessage(), fields: parsed.fields };
  }

  const result = await registerUser({
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
    confirmPassword: parsed.data.password,
    role: parsed.data.role,
  });

  if (!result.ok) {
    return { error: result.error, fields: result.fields };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: registerErrorMessage() };
    }
    throw error;
  }

  redirect(destinationForUser(result.user.role));
}

export async function googleSignInAction(formData: FormData): Promise<void> {
  const callbackUrl =
    safeCallbackUrl(formData.get("callbackUrl")?.toString()) ?? "/customer";
  await signIn("google", { redirectTo: callbackUrl });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
