export const USER_ROLES = ["customer", "vendor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const REGISTERABLE_ROLES = ["customer", "vendor"] as const;
export type RegisterableRole = (typeof REGISTERABLE_ROLES)[number];

export const ACCOUNT_STATUSES = ["pending", "active", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const KYC_STATUSES = [
  "not_started",
  "pending",
  "approved",
  "rejected",
] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  "unverified",
  "verified",
  "rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VEHICLE_CATEGORIES = [
  "car",
  "suv",
  "van",
  "truck",
  "bus",
  "two_wheeler",
  "auto_rickshaw",
  "e_rickshaw",
  "train",
  "airplane",
  "other",
] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export const VEHICLE_AVAILABILITY = [
  "available",
  "unavailable",
  "maintenance",
] as const;
export type VehicleAvailability = (typeof VEHICLE_AVAILABILITY)[number];

export const VEHICLE_STATUSES = ["draft", "active", "inactive", "blocked"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const PRICING_UNITS = ["hour", "day", "trip"] as const;
export type PricingUnit = (typeof PRICING_UNITS)[number];

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
  "in_progress",
  "completed",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_RECORD_STATUSES = [
  "created",
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

export const PAYMENT_PROVIDERS = ["none", "razorpay"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const DEFAULT_CURRENCY = "INR";
