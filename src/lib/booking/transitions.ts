import type { BookingStatus, UserRole } from "@/types/domain";

export const BLOCKING_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
] as const;

export type BlockingBookingStatus = (typeof BLOCKING_BOOKING_STATUSES)[number];

export const TERMINAL_BOOKING_STATUSES = [
  "rejected",
  "cancelled",
  "completed",
] as const;

export const BOOKING_ACTIONS = [
  "confirm",
  "reject",
  "start",
  "complete",
  "cancel",
] as const;

export type BookingAction = (typeof BOOKING_ACTIONS)[number];

const TRANSITIONS: Record<
  BookingAction,
  { from: readonly BookingStatus[]; to: BookingStatus; roles: readonly UserRole[] }
> = {
  confirm: { from: ["pending"], to: "confirmed", roles: ["vendor"] },
  reject: { from: ["pending"], to: "rejected", roles: ["vendor"] },
  start: { from: ["confirmed"], to: "in_progress", roles: ["vendor"] },
  complete: { from: ["in_progress"], to: "completed", roles: ["vendor"] },
  cancel: { from: ["pending", "confirmed"], to: "cancelled", roles: ["customer"] },
};

export function isBookingAction(value: string): value is BookingAction {
  return (BOOKING_ACTIONS as readonly string[]).includes(value);
}

export function isBlockingBookingStatus(status: BookingStatus): boolean {
  return (BLOCKING_BOOKING_STATUSES as readonly string[]).includes(status);
}

export function isTerminalBookingStatus(status: BookingStatus): boolean {
  return (TERMINAL_BOOKING_STATUSES as readonly string[]).includes(status);
}

export function transitionForAction(action: BookingAction) {
  return TRANSITIONS[action];
}

export function resolveBookingTransition(
  current: BookingStatus,
  action: BookingAction,
  role: UserRole,
): BookingStatus {
  const rule = TRANSITIONS[action];
  if (!rule.roles.includes(role) || !rule.from.includes(current)) {
    throw Object.assign(new Error("BOOKING_INVALID_TRANSITION"), {
      code: "BOOKING_INVALID_TRANSITION",
    });
  }
  return rule.to;
}
