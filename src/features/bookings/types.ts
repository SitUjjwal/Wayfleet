import type { BookingStatus, PaymentStatus, PricingUnit } from "@/types/domain";

export type BookingListItem = {
  id: string;
  vehicle: { id: string; displayName: string };
  vendor: { id: string; businessName: string };
  customer?: { id: string; name: string; email?: string };
  pickup: {
    label: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  destination: {
    label: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  startsAt: string;
  endsAt: string;
  amount: number;
  currency: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  snapshot: {
    vehicleDisplayName: string;
    vendorBusinessName: string;
    unitAmount: number;
    currency: string;
    unit: PricingUnit;
  };
  cancellation?: {
    cancelledAt: string;
    cancelledByRole: string;
    reason?: string;
  };
  createdAt: string;
};
