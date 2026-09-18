"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { registerAction, type AuthFormState } from "@/features/auth/actions";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  const roleErrorId = "role-error";

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4" noValidate>
        <TextField
          id="name"
          name="name"
          label="Name"
          autoComplete="name"
          required
          error={state.fields?.name}
        />
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
          autoComplete="new-password"
          required
          error={state.fields?.password}
        />
        <TextField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          error={state.fields?.confirmPassword}
        />
        <div className="space-y-1.5">
          <label htmlFor="role" className="block text-sm font-medium text-navy">
            Account type
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue="customer"
            aria-invalid={state.fields?.role ? true : undefined}
            aria-describedby={state.fields?.role ? roleErrorId : undefined}
            className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm text-ink outline-none ring-navy focus:ring-2"
          >
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
          </select>
          {state.fields?.role ? (
            <p id={roleErrorId} className="text-sm text-danger">
              {state.fields.role}
            </p>
          ) : null}
        </div>
        <FormError message={state.error} />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
      <p className="text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-navy underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
