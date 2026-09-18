import type { BookingStatus } from "@/types/domain";

export const TRACKING_ELIGIBLE_STATUSES = ["confirmed", "in_progress"] as const;
export type TrackingEligibleStatus = (typeof TRACKING_ELIGIBLE_STATUSES)[number];

export function isTrackingEligible(
  status: BookingStatus | string,
): status is TrackingEligibleStatus {
  return status === "confirmed" || status === "in_progress";
}
