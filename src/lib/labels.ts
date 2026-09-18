import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  VEHICLE_AVAILABILITY,
  VEHICLE_CATEGORIES,
  type BookingStatus,
  type PaymentStatus,
  type VehicleAvailability,
  type VehicleCategory,
} from "@/types/domain";

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  car: "Car",
  suv: "SUV",
  van: "Van",
  truck: "Truck",
  bus: "Bus",
  two_wheeler: "Motorcycle",
  auto_rickshaw: "Auto",
  e_rickshaw: "E-rickshaw",
  train: "Train",
  airplane: "Airplane",
  other: "Other",
};

export const AVAILABILITY_LABELS: Record<VehicleAvailability, string> = {
  available: "Available",
  unavailable: "Unavailable",
  maintenance: "In maintenance",
};

export function isVehicleCategory(value: string): value is VehicleCategory {
  return (VEHICLE_CATEGORIES as readonly string[]).includes(value);
}

export function isVehicleAvailability(value: string): value is VehicleAvailability {
  return (VEHICLE_AVAILABILITY as readonly string[]).includes(value);
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  in_progress: "In progress",
  completed: "Completed",
};

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Processing",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}
