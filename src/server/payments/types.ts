import type { SessionUser } from "@/server/auth/types";
import type {
  BookingStatus,
  PaymentProvider,
  PaymentRecordStatus,
  PaymentStatus,
} from "@/types/domain";

export type BookingPaymentView = {
  id: string;
  customerId: string;
  vendorId: string;
  amount: number;
  currency: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
};

export type PaymentRecord = {
  id: string;
  bookingId: string;
  customerId: string;
  vendorId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerSignature?: string;
  failureCode?: string;
  status: PaymentRecordStatus;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentWrite = {
  bookingId: string;
  customerId: string;
  vendorId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerSignature?: string;
  failureCode?: string;
  status: PaymentRecordStatus;
  paidAt?: Date;
};

export type PaymentPatch = Partial<
  Pick<
    PaymentRecord,
    | "provider"
    | "providerOrderId"
    | "providerPaymentId"
    | "providerSignature"
    | "failureCode"
    | "status"
    | "paidAt"
    | "amount"
    | "currency"
  >
>;

export type PaymentStore = {
  getBooking(id: string): Promise<BookingPaymentView | null>;
  getVendorIdForUser(userId: string): Promise<string | null>;
  getPaymentByBooking(bookingId: string): Promise<PaymentRecord | null>;
  getPaymentByOrderId(orderId: string): Promise<PaymentRecord | null>;
  getPaymentById(id: string): Promise<PaymentRecord | null>;
  insertPayment(input: PaymentWrite): Promise<PaymentRecord>;
  updatePayment(
    id: string,
    patch: PaymentPatch,
    options?: {
      expectedStatuses?: PaymentRecordStatus[];
      unset?: Array<
        "providerPaymentId" | "providerSignature" | "failureCode" | "paidAt"
      >;
    },
  ): Promise<PaymentRecord | null>;
  updateBookingPaymentStatus(
    bookingId: string,
    status: PaymentStatus,
  ): Promise<void>;
};

export type RazorpayOrderInput = {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type RazorpayOrderResult = {
  id: string;
  amount: number;
  currency: string;
};

export type RazorpayPaymentFetch = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
};

export type RazorpayGateway = {
  createOrder(input: RazorpayOrderInput): Promise<RazorpayOrderResult>;
  verifyPaymentSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  fetchPayment?(paymentId: string): Promise<RazorpayPaymentFetch | null>;
};

export type PaymentContext = {
  store: PaymentStore;
  gateway: RazorpayGateway;
  keyId: string;
  now: () => Date;
};

export type PaymentActor = SessionUser;
