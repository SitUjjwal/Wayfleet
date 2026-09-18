import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthHttpError } from "@/server/auth/http-error";
import type { SessionUser } from "@/server/auth/types";
import { PaymentHttpError } from "@/server/payments/errors";

vi.mock("@/server/auth/guards", () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/server/payments/service", () => ({
  createPaymentOrderForCustomer: vi.fn(),
  verifyPaymentForCustomer: vi.fn(),
  processPaymentWebhook: vi.fn(),
  getSafePaymentForUser: vi.fn(),
  findSafePaymentForUser: vi.fn(),
}));

import { requireAuth, requireRole } from "@/server/auth/guards";
import { POST as CREATE } from "@/app/api/payments/create-order/route";
import { GET as GET_PAYMENT } from "@/app/api/payments/route";
import { POST as VERIFY } from "@/app/api/payments/verify/route";
import { POST as WEBHOOK } from "@/app/api/payments/webhook/route";
import {
  createPaymentOrderForCustomer,
  getSafePaymentForUser,
  processPaymentWebhook,
  verifyPaymentForCustomer,
} from "@/server/payments/service";

const customer: SessionUser = {
  id: "507f1f77bcf86cd799439011",
  role: "customer",
  status: "active",
};

const checkout = {
  orderId: "order_abc",
  amount: 150000,
  currency: "INR",
  keyId: "rzp_test_public_key",
};

function request(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("payment API routes", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset();
    vi.mocked(requireRole).mockReset();
    vi.mocked(createPaymentOrderForCustomer).mockReset();
    vi.mocked(verifyPaymentForCustomer).mockReset();
    vi.mocked(processPaymentWebhook).mockReset();
    vi.mocked(getSafePaymentForUser).mockReset();
  });

  it("rejects unauthenticated create-order with 401", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthHttpError(401));
    const response = await CREATE(
      request("http://localhost/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ bookingId: "507f1f77bcf86cd799439099" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects vendor create-order with 403", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthHttpError(403));
    const response = await CREATE(
      request("http://localhost/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ bookingId: "507f1f77bcf86cd799439099" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("returns checkout data without the secret key", async () => {
    vi.mocked(requireRole).mockResolvedValue(customer);
    vi.mocked(createPaymentOrderForCustomer).mockResolvedValue(checkout);
    const response = await CREATE(
      request("http://localhost/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ bookingId: "507f1f77bcf86cd799439099" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(checkout);
    expect(JSON.stringify(body)).not.toContain("RAZORPAY_KEY_SECRET");
    expect(JSON.stringify(body)).not.toContain("key_secret");
    expect(JSON.stringify(body)).not.toContain("test_only_razorpay_key_secret");
  });

  it("maps service ownership errors on create-order", async () => {
    vi.mocked(requireRole).mockResolvedValue(customer);
    vi.mocked(createPaymentOrderForCustomer).mockRejectedValue(
      new PaymentHttpError(403, "Forbidden"),
    );
    const response = await CREATE(
      request("http://localhost/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ bookingId: "507f1f77bcf86cd799439099" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("verifies a payment and returns the paid status", async () => {
    vi.mocked(requireRole).mockResolvedValue(customer);
    vi.mocked(verifyPaymentForCustomer).mockResolvedValue({
      bookingId: "507f1f77bcf86cd799439099",
      paymentStatus: "paid",
      reference: "pay_ok",
      paidAt: "2026-09-09T10:05:00.000Z",
    });
    const response = await VERIFY(
      request("http://localhost/api/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          bookingId: "507f1f77bcf86cd799439099",
          razorpay_order_id: "order_abc",
          razorpay_payment_id: "pay_ok",
          razorpay_signature: "sig",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.paymentStatus).toBe("paid");
    expect(JSON.stringify(body)).not.toContain("key_secret");
  });

  it("rejects invalid verify signatures from the service", async () => {
    vi.mocked(requireRole).mockResolvedValue(customer);
    vi.mocked(verifyPaymentForCustomer).mockRejectedValue(
      new PaymentHttpError(400, "Invalid payment signature"),
    );
    const response = await VERIFY(
      request("http://localhost/api/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          bookingId: "507f1f77bcf86cd799439099",
          razorpay_order_id: "order_abc",
          razorpay_payment_id: "pay_ok",
          razorpay_signature: "bad",
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("processes a webhook without session auth", async () => {
    vi.mocked(processPaymentWebhook).mockResolvedValue({
      received: true,
      applied: "paid",
    });
    const response = await WEBHOOK(
      new Request("http://localhost/api/payments/webhook", {
        method: "POST",
        headers: { "x-razorpay-signature": "sig" },
        body: JSON.stringify({ event: "payment.captured" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(vi.mocked(requireRole)).not.toHaveBeenCalled();
    expect(vi.mocked(requireAuth)).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid webhook signature", async () => {
    vi.mocked(processPaymentWebhook).mockRejectedValue(
      new PaymentHttpError(400, "Invalid webhook signature"),
    );
    const response = await WEBHOOK(
      new Request("http://localhost/api/payments/webhook", {
        method: "POST",
        headers: { "x-razorpay-signature": "bad" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects unauthorized payment record reads", async () => {
    vi.mocked(requireAuth).mockResolvedValue(customer);
    vi.mocked(getSafePaymentForUser).mockRejectedValue(
      new PaymentHttpError(403, "Forbidden"),
    );
    const response = await GET_PAYMENT(
      request("http://localhost/api/payments?bookingId=507f1f77bcf86cd799439099"),
    );
    expect(response.status).toBe(403);
  });

  it("returns a safe payment record", async () => {
    vi.mocked(requireAuth).mockResolvedValue(customer);
    vi.mocked(getSafePaymentForUser).mockResolvedValue({
      bookingId: "507f1f77bcf86cd799439099",
      amount: 150000,
      currency: "INR",
      status: "paid",
      bookingPaymentStatus: "paid",
      provider: "razorpay",
      reference: "pay_ok",
      paidAt: "2026-09-09T10:05:00.000Z",
    });
    const response = await GET_PAYMENT(
      request("http://localhost/api/payments?bookingId=507f1f77bcf86cd799439099"),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.reference).toBe("pay_ok");
    expect(JSON.stringify(body)).not.toContain("providerSignature");
    expect(JSON.stringify(body)).not.toContain("RAZORPAY_KEY_SECRET");
  });
});
