import { createHmac, timingSafeEqual } from "node:crypto";
import { REALTIME_TOKEN_TTL_SECONDS } from "@/lib/tracking/constants";
import type { AccountStatus, UserRole } from "@/types/domain";
import { parseAccountStatus, parseUserRole } from "@/server/auth/types";

export type RealtimeIdentity = {
  id: string;
  role: UserRole;
  status: AccountStatus;
};

export type RealtimeTokenPayload = RealtimeIdentity & {
  typ: "realtime";
  iat: number;
  exp: number;
};

export class RealtimeTokenError extends Error {
  constructor(message = "Invalid realtime token") {
    super(message);
    this.name = "RealtimeTokenError";
  }
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function signInput(header: string, body: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`${header}.${body}`).digest();
}

export function signRealtimeToken(
  identity: RealtimeIdentity,
  secret: string,
  now = Date.now(),
  ttlSeconds = REALTIME_TOKEN_TTL_SECONDS,
): string {
  const iat = Math.floor(now / 1000);
  const payload: RealtimeTokenPayload = {
    id: identity.id,
    role: identity.role,
    status: identity.status,
    typ: "realtime",
    iat,
    exp: iat + ttlSeconds,
  };
  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const body = encodeJson(payload);
  const signature = signInput(header, body, secret).toString("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyRealtimeToken(token: string, secret: string, now = Date.now()): RealtimeIdentity {
  if (typeof token !== "string" || token.split(".").length !== 3) {
    throw new RealtimeTokenError();
  }
  const [header, body, signature] = token.split(".");
  const expected = signInput(header, body, secret);
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    throw new RealtimeTokenError();
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new RealtimeTokenError();
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new RealtimeTokenError();
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new RealtimeTokenError();
  }
  const record = payload as Record<string, unknown>;
  if (record.typ !== "realtime") {
    throw new RealtimeTokenError();
  }
  const role = parseUserRole(record.role);
  const status = parseAccountStatus(record.status);
  if (typeof record.id !== "string" || !role || !status) {
    throw new RealtimeTokenError();
  }
  if (typeof record.exp !== "number" || record.exp * 1000 <= now) {
    throw new RealtimeTokenError("Realtime token expired");
  }
  if (status === "suspended") {
    throw new RealtimeTokenError();
  }
  return { id: record.id, role, status };
}
