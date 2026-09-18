import { EMAIL_PATTERN } from "@/lib/validation/patterns";
import {
  REGISTERABLE_ROLES,
  type RegisterableRole,
  type UserRole,
} from "@/types/domain";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type FieldErrors = Record<string, string>;

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: RegisterableRole;
};

const GENERIC_LOGIN_ERROR = "Invalid email or password";
const GENERIC_REGISTER_ERROR = "Unable to create account";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function parseLoginInput(input: {
  email?: unknown;
  password?: unknown;
}): { data?: LoginInput; error?: string; fields?: FieldErrors } {
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const password = typeof input.password === "string" ? input.password : "";
  const fields: FieldErrors = {};

  if (!EMAIL_PATTERN.test(email)) {
    fields.email = "Enter a valid email address";
  }
  if (!password) {
    fields.password = "Enter your password";
  }

  if (Object.keys(fields).length > 0) {
    return { error: GENERIC_LOGIN_ERROR, fields };
  }

  return { data: { email, password } };
}

export function parseRegisterRole(value: unknown): RegisterableRole | null {
  if (typeof value !== "string") {
    return null;
  }
  return (REGISTERABLE_ROLES as readonly string[]).includes(value)
    ? (value as RegisterableRole)
    : null;
}

export function isAdminSelfRegistration(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "admin";
}

export function parseRegisterInput(input: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  role?: unknown;
}): { data?: RegisterInput; error?: string; fields?: FieldErrors } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const password = typeof input.password === "string" ? input.password : "";
  const confirmPassword =
    typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  const fields: FieldErrors = {};

  if (name.length < 1 || name.length > 120) {
    fields.name = "Enter your name";
  }
  if (!EMAIL_PATTERN.test(email)) {
    fields.email = "Enter a valid email address";
  }
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    fields.password = `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`;
  }
  if (password !== confirmPassword) {
    fields.confirmPassword = "Passwords do not match";
  }
  if (isAdminSelfRegistration(input.role)) {
    return { error: GENERIC_REGISTER_ERROR, fields: { role: "Invalid role" } };
  }
  const role = parseRegisterRole(input.role);
  if (!role) {
    fields.role = "Choose customer or vendor";
  }

  if (Object.keys(fields).length > 0) {
    return { error: GENERIC_REGISTER_ERROR, fields };
  }

  return {
    data: {
      name,
      email,
      password,
      role: role as RegisterableRole,
    },
  };
}

export function loginErrorMessage(): string {
  return GENERIC_LOGIN_ERROR;
}

export function registerErrorMessage(): string {
  return GENERIC_REGISTER_ERROR;
}

export function assertNotAdminRole(role: UserRole): void {
  if (role === "admin") {
    throw new Error("Invalid role");
  }
}
