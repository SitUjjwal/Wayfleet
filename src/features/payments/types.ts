import type { PaymentProvider, PaymentRecordStatus, PaymentStatus } from "@/types/domain";

export type SafePaymentView = {
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  bookingPaymentStatus: PaymentStatus;
  provider: PaymentProvider;
  reference?: string;
  paidAt?: string;
};
