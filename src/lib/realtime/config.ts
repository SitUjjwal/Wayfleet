import { TRACKING_MIN_INTERVAL_MS } from "@/lib/tracking/constants";

export function getBrowserRealtimeUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_REALTIME_URL?.trim();
  return value ? value.replace(/\/$/, "") : undefined;
}

export function isRealtimeConfigured(): boolean {
  return Boolean(getBrowserRealtimeUrl());
}

export function getRealtimeSecret(): string {
  const dedicated = process.env.REALTIME_SERVER_SECRET?.trim();
  if (dedicated) {
    return dedicated;
  }
  const auth = process.env.AUTH_SECRET?.trim();
  if (auth) {
    return auth;
  }
  throw new Error("REALTIME_SERVER_SECRET or AUTH_SECRET is required");
}

export function getRealtimePort(): number {
  const parsed = Number(process.env.PORT ?? process.env.REALTIME_PORT ?? 4001);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 4001;
}

export function getTrackingMinIntervalMs(): number {
  const parsed = Number(process.env.TRACKING_MIN_INTERVAL_MS);
  if (Number.isInteger(parsed) && parsed >= 1_000 && parsed <= 60_000) {
    return parsed;
  }
  return TRACKING_MIN_INTERVAL_MS;
}

export function getRealtimeCorsOrigins(): string[] {
  const origins = new Set<string>();
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) {
    origins.add(authUrl.replace(/\/$/, ""));
  }
  const extra = process.env.REALTIME_CORS_ORIGIN?.trim();
  if (extra) {
    for (const item of extra.split(",")) {
      const origin = item.trim().replace(/\/$/, "");
      if (origin) {
        origins.add(origin);
      }
    }
  }
  origins.add("http://localhost:3000");
  return [...origins];
}
