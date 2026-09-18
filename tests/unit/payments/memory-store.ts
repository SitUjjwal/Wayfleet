import { createHmac } from "node:crypto";
import type {
  BookingPaymentView,
  PaymentContext,
  PaymentRecord,
  PaymentStore,
  PaymentWrite,
  RazorpayGateway,
} from "@/server/payments/types";
import type { PaymentStatus } from "@/types/domain";

export const TEST_KEY_ID = "rzp_test_public_key";
export const TEST_KEY_SECRET = "test_only_razorpay_key_secret";
export const TEST_WEBHOOK_SECRET = "test_only_webhook_secret";

export const CUSTOMER_ID = "507f1f77bcf86cd799439011";
export const OTHER_CUSTOMER_ID = "507f1f77bcf86cd799439021";
export const VENDOR_USER_ID = "507f1f77bcf86cd799439012";
export const VENDOR_ID = "507f1f77bcf86cd799439014";
export const OTHER_VENDOR_ID = "507f1f77bcf86cd799439024";
export const BOOKING_ID = "507f1f77bcf86cd799439099";

export function signPayment(
  orderId: string,
  paymentId: string,
  secret = TEST_KEY_SECRET,
): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function signWebhook(body: string, secret = TEST_WEBHOOK_SECRET): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function sampleBooking(
  overrides: Partial<BookingPaymentView> = {},
): BookingPaymentView {
  return {
    id: BOOKING_ID,
    customerId: CUSTOMER_ID,
    vendorId: VENDOR_ID,
    amount: 150000,
    currency: "INR",
    bookingStatus: "pending",
    paymentStatus: "unpaid",
    ...overrides,
  };
}

export function createMemoryGateway(
  options: {
    createOrder?: RazorpayGateway["createOrder"];
    fetchPayment?: RazorpayGateway["fetchPayment"];
    failCreate?: boolean;
    createdOrderId?: string;
  } = {},
): RazorpayGateway & { createdOrders: string[] } {
  const createdOrders: string[] = [];
  let seq = 0;
  return {
    createdOrders,
    async createOrder(input) {
      if (options.failCreate) {
        throw new Error("ECONNREFUSED");
      }
      if (options.createOrder) {
        return options.createOrder(input);
      }
      seq += 1;
      const id = options.createdOrderId ?? `order_mem_${seq}`;
      createdOrders.push(id);
      return { id, amount: input.amount, currency: input.currency };
    },
    verifyPaymentSignature(input) {
      return (
        signPayment(input.orderId, input.paymentId) === input.signature
      );
    },
    verifyWebhookSignature(rawBody, signature) {
      return signWebhook(rawBody) === signature;
    },
    fetchPayment: options.fetchPayment,
  };
}

export function createMemoryPaymentStore(
  seed: BookingPaymentView[] = [sampleBooking()],
): PaymentStore & {
  bookings: BookingPaymentView[];
  payments: PaymentRecord[];
  vendorByUser: Map<string, string>;
} {
  const bookings = [...seed];
  const payments: PaymentRecord[] = [];
  const vendorByUser = new Map<string, string>([[VENDOR_USER_ID, VENDOR_ID]]);
  let seq = 0;

  const store: PaymentStore & {
    bookings: BookingPaymentView[];
    payments: PaymentRecord[];
    vendorByUser: Map<string, string>;
  } = {
    bookings,
    payments,
    vendorByUser,
    async getBooking(id) {
      return bookings.find((item) => item.id === id) ?? null;
    },
    async getVendorIdForUser(userId) {
      return vendorByUser.get(userId) ?? null;
    },
    async getPaymentByBooking(bookingId) {
      return payments.find((item) => item.bookingId === bookingId) ?? null;
    },
    async getPaymentByOrderId(orderId) {
      return payments.find((item) => item.providerOrderId === orderId) ?? null;
    },
    async getPaymentById(id) {
      return payments.find((item) => item.id === id) ?? null;
    },
    async insertPayment(input: PaymentWrite) {
      if (payments.some((item) => item.bookingId === input.bookingId)) {
        throw new Error("E11000 duplicate booking");
      }
      if (
        input.providerOrderId &&
        payments.some((item) => item.providerOrderId === input.providerOrderId)
      ) {
        throw new Error("E11000 duplicate providerOrderId");
      }
      seq += 1;
      const now = new Date("2026-09-09T10:00:00.000Z");
      const record: PaymentRecord = {
        id: `pay_${seq}`,
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      payments.push(record);
      return { ...record };
    },
    async updatePayment(id, patch, options) {
      const current = payments.find((item) => item.id === id);
      if (!current) {
        return null;
      }
      if (
        options?.expectedStatuses &&
        !options.expectedStatuses.includes(current.status)
      ) {
        return null;
      }
      if (
        patch.providerOrderId &&
        payments.some(
          (item) =>
            item.id !== id && item.providerOrderId === patch.providerOrderId,
        )
      ) {
        throw new Error("E11000 duplicate providerOrderId");
      }
      Object.assign(current, patch, { updatedAt: new Date("2026-09-09T10:01:00.000Z") });
      for (const key of options?.unset ?? []) {
        delete current[key];
      }
      return { ...current };
    },
    async updateBookingPaymentStatus(bookingId, status: PaymentStatus) {
      const booking = bookings.find((item) => item.id === bookingId);
      if (!booking) {
        throw new Error("booking missing");
      }
      booking.paymentStatus = status;
    },
  };
  return store;
}

export function createPaymentContext(
  overrides: {
    store?: PaymentStore;
    gateway?: RazorpayGateway;
    keyId?: string;
  } = {},
): PaymentContext {
  return {
    store: overrides.store ?? createMemoryPaymentStore(),
    gateway: overrides.gateway ?? createMemoryGateway(),
    keyId: overrides.keyId ?? TEST_KEY_ID,
    now: () => new Date("2026-09-09T10:05:00.000Z"),
  };
}
