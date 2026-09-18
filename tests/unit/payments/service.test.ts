import { describe, expect, it } from "vitest";
import {
  createPaymentOrder,
  getPaymentForUser,
  processWebhook,
  verifyPayment,
} from "@/server/payments/core";
import { PaymentHttpError } from "@/server/payments/errors";
import { publicPaymentContainsSecrets } from "@/server/payments/dto";
import type { SessionUser } from "@/server/auth/types";
import {
  BOOKING_ID,
  CUSTOMER_ID,
  OTHER_CUSTOMER_ID,
  TEST_KEY_ID,
  VENDOR_ID,
  VENDOR_USER_ID,
  createMemoryGateway,
  createMemoryPaymentStore,
  createPaymentContext,
  sampleBooking,
  signPayment,
  signWebhook,
} from "./memory-store";

const customer: SessionUser = {
  id: CUSTOMER_ID,
  role: "customer",
  status: "active",
};

const otherCustomer: SessionUser = {
  id: OTHER_CUSTOMER_ID,
  role: "customer",
  status: "active",
};

const vendor: SessionUser = {
  id: VENDOR_USER_ID,
  role: "vendor",
  status: "active",
};

async function expectStatus(
  run: () => Promise<unknown>,
  status: number,
  message?: RegExp,
) {
  try {
    await run();
    throw new Error("expected PaymentHttpError");
  } catch (error) {
    expect(error).toBeInstanceOf(PaymentHttpError);
    expect((error as PaymentHttpError).status).toBe(status);
    if (message) {
      expect((error as PaymentHttpError).message).toMatch(message);
    }
  }
}

describe("payment service", () => {
  it("creates an order from the persisted booking amount", async () => {
    const store = createMemoryPaymentStore();
    const gateway = createMemoryGateway();
    const ctx = createPaymentContext({ store, gateway });
    const result = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    expect(result).toEqual({
      orderId: "order_mem_1",
      amount: 150000,
      currency: "INR",
      keyId: TEST_KEY_ID,
    });
    expect(result).not.toHaveProperty("keySecret");
    expect(publicPaymentContainsSecrets(result)).toBe(false);
    expect(store.bookings[0]?.paymentStatus).toBe("pending");
    expect(store.payments[0]?.vendorId).toBe(VENDOR_ID);
    expect(store.payments[0]?.amount).toBe(150000);
  });

  it("ignores client amount, vendorId, and paymentStatus because they are rejected", async () => {
    const ctx = createPaymentContext();
    await expectStatus(
      () =>
        createPaymentOrder(ctx, customer, {
          bookingId: BOOKING_ID,
          amount: 1,
        }),
      422,
    );
    await expectStatus(
      () =>
        createPaymentOrder(ctx, customer, {
          bookingId: BOOKING_ID,
          vendorId: OTHER_CUSTOMER_ID,
        }),
      422,
    );
    await expectStatus(
      () =>
        createPaymentOrder(ctx, customer, {
          bookingId: BOOKING_ID,
          paymentStatus: "paid",
        }),
      422,
    );
  });

  it("rejects another customer's booking", async () => {
    const ctx = createPaymentContext();
    await expectStatus(
      () => createPaymentOrder(ctx, otherCustomer, { bookingId: BOOKING_ID }),
      403,
    );
  });

  it("rejects vendor create-order", async () => {
    const ctx = createPaymentContext();
    await expectStatus(
      () => createPaymentOrder(ctx, vendor, { bookingId: BOOKING_ID }),
      403,
    );
  });

  it("returns 404 for an unknown booking", async () => {
    const ctx = createPaymentContext();
    await expectStatus(
      () =>
        createPaymentOrder(ctx, customer, {
          bookingId: "507f1f77bcf86cd799439000",
        }),
      404,
    );
  });

  it("rejects invalid booking ids", async () => {
    const ctx = createPaymentContext();
    await expectStatus(
      () => createPaymentOrder(ctx, customer, { bookingId: "bad" }),
      400,
    );
  });

  it.each(["cancelled", "rejected", "completed"] as const)(
    "does not allow paying a %s booking",
    async (bookingStatus) => {
      const store = createMemoryPaymentStore([
        sampleBooking({ bookingStatus }),
      ]);
      const ctx = createPaymentContext({ store });
      await expectStatus(
        () => createPaymentOrder(ctx, customer, { bookingId: BOOKING_ID }),
        409,
      );
      expect(store.bookings[0]?.paymentStatus).toBe("unpaid");
    },
  );

  it("reuses a usable existing order instead of creating another", async () => {
    const store = createMemoryPaymentStore();
    const gateway = createMemoryGateway();
    const ctx = createPaymentContext({ store, gateway });
    const first = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    const second = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    expect(second.orderId).toBe(first.orderId);
    expect(gateway.createdOrders).toEqual(["order_mem_1"]);
    expect(store.payments).toHaveLength(1);
  });

  it("creates a new order after a failed payment", async () => {
    const store = createMemoryPaymentStore();
    const gateway = createMemoryGateway();
    const ctx = createPaymentContext({ store, gateway });
    await createPaymentOrder(ctx, customer, { bookingId: BOOKING_ID });
    store.payments[0]!.status = "failed";
    store.bookings[0]!.paymentStatus = "failed";
    const retry = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    expect(retry.orderId).toBe("order_mem_2");
    expect(store.payments).toHaveLength(1);
    expect(store.payments[0]?.status).toBe("pending");
  });

  it("fails safely when Razorpay is unavailable", async () => {
    const store = createMemoryPaymentStore();
    const ctx = createPaymentContext({
      store,
      gateway: createMemoryGateway({ failCreate: true }),
    });
    await expectStatus(
      () => createPaymentOrder(ctx, customer, { bookingId: BOOKING_ID }),
      502,
    );
    expect(store.payments).toHaveLength(0);
    expect(store.bookings[0]?.paymentStatus).toBe("unpaid");
  });

  it("accepts a correct signature and marks only paymentStatus paid", async () => {
    const store = createMemoryPaymentStore();
    const ctx = createPaymentContext({ store });
    const order = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    const verified = await verifyPayment(ctx, customer, {
      bookingId: BOOKING_ID,
      razorpay_order_id: order.orderId,
      razorpay_payment_id: "pay_ok",
      razorpay_signature: signPayment(order.orderId, "pay_ok"),
    });
    expect(verified.paymentStatus).toBe("paid");
    expect(store.payments[0]?.status).toBe("paid");
    expect(store.bookings[0]?.paymentStatus).toBe("paid");
    expect(store.bookings[0]?.bookingStatus).toBe("pending");
    expect(publicPaymentContainsSecrets(verified)).toBe(false);
    expect(JSON.stringify(verified)).not.toContain(signPayment(order.orderId, "pay_ok"));
  });

  it("rejects an invalid signature and does not mark paid", async () => {
    const store = createMemoryPaymentStore();
    const ctx = createPaymentContext({ store });
    const order = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    await expectStatus(
      () =>
        verifyPayment(ctx, customer, {
          bookingId: BOOKING_ID,
          razorpay_order_id: order.orderId,
          razorpay_payment_id: "pay_bad",
          razorpay_signature: "not-a-valid-signature",
        }),
      400,
    );
    expect(store.payments[0]?.status).toBe("pending");
    expect(store.bookings[0]?.paymentStatus).toBe("pending");
    expect(store.payments[0]?.failureCode).toBe("signature_invalid");
  });

  it("rejects a wrong Razorpay order id", async () => {
    const store = createMemoryPaymentStore();
    const ctx = createPaymentContext({ store });
    await createPaymentOrder(ctx, customer, { bookingId: BOOKING_ID });
    await expectStatus(
      () =>
        verifyPayment(ctx, customer, {
          bookingId: BOOKING_ID,
          razorpay_order_id: "order_other",
          razorpay_payment_id: "pay_ok",
          razorpay_signature: signPayment("order_other", "pay_ok"),
        }),
      422,
    );
  });

  it("is idempotent for duplicate verification of the same payment", async () => {
    const store = createMemoryPaymentStore();
    const ctx = createPaymentContext({ store });
    const order = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    const payload = {
      bookingId: BOOKING_ID,
      razorpay_order_id: order.orderId,
      razorpay_payment_id: "pay_ok",
      razorpay_signature: signPayment(order.orderId, "pay_ok"),
    };
    await verifyPayment(ctx, customer, payload);
    const again = await verifyPayment(ctx, customer, payload);
    expect(again.paymentStatus).toBe("paid");
    expect(store.payments).toHaveLength(1);
  });

  it("does not downgrade a paid payment", async () => {
    const store = createMemoryPaymentStore();
    const ctx = createPaymentContext({ store });
    const order = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    await verifyPayment(ctx, customer, {
      bookingId: BOOKING_ID,
      razorpay_order_id: order.orderId,
      razorpay_payment_id: "pay_ok",
      razorpay_signature: signPayment(order.orderId, "pay_ok"),
    });
    await expectStatus(
      () =>
        verifyPayment(ctx, customer, {
          bookingId: BOOKING_ID,
          razorpay_order_id: order.orderId,
          razorpay_payment_id: "pay_other",
          razorpay_signature: signPayment(order.orderId, "pay_other"),
        }),
      409,
    );
    expect(store.payments[0]?.status).toBe("paid");
    expect(store.payments[0]?.providerPaymentId).toBe("pay_ok");
  });

  it("does not mark the booking paid if payment persistence fails", async () => {
    const store = createMemoryPaymentStore();
    store.updatePayment = async () => {
      throw new Error("write failed");
    };
    const ctx = createPaymentContext({ store });
    const order = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    store.bookings[0]!.paymentStatus = "pending";
    await expect(
      verifyPayment(ctx, customer, {
        bookingId: BOOKING_ID,
        razorpay_order_id: order.orderId,
        razorpay_payment_id: "pay_ok",
        razorpay_signature: signPayment(order.orderId, "pay_ok"),
      }),
    ).rejects.toThrow();
    expect(store.bookings[0]?.paymentStatus).not.toBe("paid");
  });

  it("rejects unauthorized payment record access", async () => {
    const store = createMemoryPaymentStore();
    const ctx = createPaymentContext({ store });
    await createPaymentOrder(ctx, customer, { bookingId: BOOKING_ID });
    await expectStatus(
      () => getPaymentForUser(ctx, otherCustomer, BOOKING_ID),
      403,
    );
    const vendorView = await getPaymentForUser(ctx, vendor, BOOKING_ID);
    expect(vendorView.reference).toBeUndefined();
    expect(vendorView.status).toBe("pending");
  });

  it("handles a valid captured webhook and ignores duplicates", async () => {
    const store = createMemoryPaymentStore();
    const ctx = createPaymentContext({ store });
    const order = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_hook",
            order_id: order.orderId,
            amount: 150000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    });
    const first = await processWebhook(ctx, body, signWebhook(body));
    expect(first.applied).toBe("paid");
    expect(store.bookings[0]?.paymentStatus).toBe("paid");
    expect(store.bookings[0]?.bookingStatus).toBe("pending");
    const second = await processWebhook(ctx, body, signWebhook(body));
    expect(second.ignored).toBe(true);
    expect(store.payments).toHaveLength(1);
  });

  it("rejects an invalid webhook signature", async () => {
    const ctx = createPaymentContext();
    await expectStatus(
      () => processWebhook(ctx, "{}", "bad-signature"),
      400,
    );
  });

  it("ignores unknown payments and malformed payloads after a valid signature", async () => {
    const ctx = createPaymentContext();
    const unknown = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_x",
            order_id: "order_missing",
            amount: 100,
            currency: "INR",
          },
        },
      },
    });
    const ignored = await processWebhook(ctx, unknown, signWebhook(unknown));
    expect(ignored.reason).toBe("unknown_payment");
    await expectStatus(
      () => processWebhook(ctx, "{", signWebhook("{")),
      400,
    );
  });

  it("records a failed payment webhook without downgrading paid", async () => {
    const store = createMemoryPaymentStore();
    const ctx = createPaymentContext({ store });
    const order = await createPaymentOrder(ctx, customer, {
      bookingId: BOOKING_ID,
    });
    const failedBody = JSON.stringify({
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_fail",
            order_id: order.orderId,
            amount: 150000,
            currency: "INR",
            status: "failed",
          },
        },
      },
    });
    const failed = await processWebhook(ctx, failedBody, signWebhook(failedBody));
    expect(failed.applied).toBe("failed");
    expect(store.bookings[0]?.paymentStatus).toBe("failed");

    store.payments[0]!.status = "pending";
    store.bookings[0]!.paymentStatus = "pending";
    await verifyPayment(ctx, customer, {
      bookingId: BOOKING_ID,
      razorpay_order_id: order.orderId,
      razorpay_payment_id: "pay_ok",
      razorpay_signature: signPayment(order.orderId, "pay_ok"),
    });
    const afterPaid = await processWebhook(
      ctx,
      failedBody,
      signWebhook(failedBody),
    );
    expect(afterPaid.ignored).toBe(true);
    expect(store.payments[0]?.status).toBe("paid");
    expect(store.bookings[0]?.paymentStatus).toBe("paid");
  });
});
