import type {
  BookingStatus,
  PaymentStatus,
  PricingUnit,
  UserRole,
} from "@/types/domain";

export type PublicBookingLocation = {
  label: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

export type BookingSnapshotDto = {
  vehicleDisplayName: string;
  vendorBusinessName: string;
  unitAmount: number;
  currency: string;
  unit: PricingUnit;
};

export type BookingCancellationDto = {
  cancelledAt: string;
  cancelledByRole: UserRole;
  reason?: string;
};

export type BookingDto = {
  id: string;
  vehicle: {
    id: string;
    displayName: string;
  };
  vendor: {
    id: string;
    businessName: string;
  };
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
  pickup: PublicBookingLocation;
  destination: PublicBookingLocation;
  startsAt: string;
  endsAt: string;
  amount: number;
  currency: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  snapshot: BookingSnapshotDto;
  cancellation?: BookingCancellationDto;
  createdAt: string;
};

export function publicBookingContainsPrivateFields(payload: unknown): boolean {
  const json = JSON.stringify(payload);
  return (
    json.includes('"passwordHash"') ||
    json.includes('"googleSubject"') ||
    json.includes('"registrationNumber"') ||
    json.includes('"kycStatus"') ||
    json.includes('"contact"')
  );
}
