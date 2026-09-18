import type { PricingUnit } from "@/types/domain";

export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const MAX_BOOKING_DURATION_MS = 30 * MS_PER_DAY;
export const PAST_START_TOLERANCE_MS = 60 * 1000;

export function durationMs(startsAt: Date, endsAt: Date): number {
  return endsAt.getTime() - startsAt.getTime();
}

export function billableUnits(
  unit: PricingUnit,
  startsAt: Date,
  endsAt: Date,
): number {
  const ms = durationMs(startsAt, endsAt);
  if (ms <= 0) {
    return 0;
  }
  if (unit === "trip") {
    return 1;
  }
  if (unit === "hour") {
    return Math.max(1, Math.ceil(ms / MS_PER_HOUR));
  }
  return Math.max(1, Math.ceil(ms / MS_PER_DAY));
}

export function calculateBookingAmount(input: {
  unitAmount: number;
  unit: PricingUnit;
  startsAt: Date;
  endsAt: Date;
}): number {
  if (!Number.isInteger(input.unitAmount) || input.unitAmount < 0) {
    throw new Error("Invalid unit amount");
  }
  const units = billableUnits(input.unit, input.startsAt, input.endsAt);
  return input.unitAmount * units;
}
