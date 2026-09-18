import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/validation/auth-input";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH };

export function isPasswordLengthValid(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}

export async function hashPassword(password: string): Promise<string> {
  if (!isPasswordLengthValid(password)) {
    throw new Error("Invalid password");
  }

  const salt = randomBytes(SALT_BYTES);
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (!password || !storedHash) {
    return false;
  }

  const [scheme, saltB64, hashB64] = storedHash.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) {
    return false;
  }

  try {
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    if (expected.length === 0) {
      return false;
    }
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    if (actual.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
