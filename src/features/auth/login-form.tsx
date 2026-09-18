"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import {
  googleSignInAction,
  loginAction,
  type AuthFormState,
} from "@/features/auth/actions";

const initialState: AuthFormState = {};

type LoginFormProps = {
  callbackUrl?: string;
  googleEnabled: boolean;
  oauthError?: string;
};

export function LoginForm({ callbackUrl, googleEnabled, oauthError }: LoginFormProps) {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <div className="space-y-6">
      {oauthError ? <FormError message={oauthError} /> : null}
      <form action={action} className="space-y-4" noValidate>
        {callbackUrl ? (
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
        ) : null}
        <TextField
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={state.fields?.email}
        />
        <TextField
          id="password"
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          error={state.fields?.password}
        />
        <FormError message={state.error} />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>

      {googleEnabled ? (
        <form action={googleSignInAction}>
          {callbackUrl ? (
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
          ) : null}
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md border border-line bg-paper-strong px-4 py-2.5 text-sm font-medium text-navy hover:bg-paper"
          >
            Continue with Google
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Google sign-in is available after AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
          are configured.
        </p>
      )}

      <p className="text-sm text-muted">
        No account?{" "}
        <Link href="/register" className="font-medium text-navy underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
