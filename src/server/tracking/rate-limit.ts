import { TRACKING_COORD_EPSILON } from "@/lib/tracking/constants";

type RateEntry = {
  at: number;
  latitude: number;
  longitude: number;
};

export type RateLimitResult = "ok" | "rate_limited" | "unchanged";

export class TrackingRateLimiter {
  private readonly last = new Map<string, RateEntry>();

  constructor(
    private readonly minIntervalMs: number,
    private readonly epsilon = TRACKING_COORD_EPSILON,
  ) {}

  check(key: string, latitude: number, longitude: number, now = Date.now()): RateLimitResult {
    const previous = this.last.get(key);
    if (previous && now - previous.at < this.minIntervalMs) {
      return "rate_limited";
    }
    if (
      previous &&
      Math.abs(previous.latitude - latitude) < this.epsilon &&
      Math.abs(previous.longitude - longitude) < this.epsilon
    ) {
      this.last.set(key, { at: now, latitude, longitude });
      return "unchanged";
    }
    this.last.set(key, { at: now, latitude, longitude });
    if (this.last.size > 10_000) {
      this.prune(now);
    }
    return "ok";
  }

  reset() {
    this.last.clear();
  }

  private prune(now: number) {
    const maxAge = this.minIntervalMs * 120;
    for (const [key, entry] of this.last) {
      if (now - entry.at > maxAge) {
        this.last.delete(key);
      }
    }
  }
}
