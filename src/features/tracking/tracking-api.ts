import type { TrackingSnapshot } from "@/features/tracking/types";

type ApiFailure = { success: false; error: string };
type ApiSuccess<T> = { success: true; data: T };

async function readJson<T>(path: string): Promise<{ status: number; body: ApiSuccess<T> | ApiFailure }> {
  const response = await fetch(path, { credentials: "include" });
  const body = (await response.json()) as ApiSuccess<T> | ApiFailure;
  return { status: response.status, body };
}

export async function fetchTrackingSnapshot(bookingId: string) {
  return readJson<TrackingSnapshot>(`/api/tracking/${bookingId}`);
}

export async function fetchRealtimeToken() {
  return readJson<{ token: string; expiresAt: string }>("/api/realtime/token");
}
