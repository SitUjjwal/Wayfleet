"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingPaymentDetails } from "@/components/booking/booking-payment-details";
import { Button } from "@/components/ui/button";
import type { SafePaymentView } from "@/features/payments/types";
import {
  requestPaymentApi,
  type CheckoutDto,
} from "@/features/payments/payment-api";
import type { PaymentStatus } from "@/types/domain";

type RazorpayCheckoutHandler = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: () => void) => void;
};

type RazorpayCheckoutCtor = new (options: {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayCheckoutHandler) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color: string };
}) => RazorpayCheckoutInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCheckoutCtor;
  }
}

function loadCheckoutScript(): Promise<RazorpayCheckoutCtor> {
  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Razorpay) resolve(window.Razorpay);
        else reject(new Error("checkout"));
      });
      existing.addEventListener("error", () => reject(new Error("checkout")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("checkout"));
    };
    script.onerror = () => reject(new Error("checkout"));
    document.body.appendChild(script);
  });
}

export function BookingPaymentPanel({
  bookingId,
  amount,
  currency,
  bookingStatusEligible,
  paymentStatus,
  payment,
  audience,
}: {
  bookingId: string;
  amount: number;
  currency: string;
  bookingStatusEligible: boolean;
  paymentStatus: PaymentStatus;
  payment?: SafePaymentView | null;
  audience: "customer" | "vendor";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function startCheckout() {
    setBusy(true);
    setError(undefined);
    try {
      const { body } = await requestPaymentApi<CheckoutDto>(
        "/api/payments/create-order",
        {
          method: "POST",
          body: JSON.stringify({ bookingId }),
        },
      );
      if (!body.success) {
        setError(body.error);
        return;
      }
      const checkout = body.data;
      const Razorpay = await loadCheckoutScript();
      await new Promise<void>((resolve, reject) => {
        const instance = new Razorpay({
          key: checkout.keyId,
          amount: checkout.amount,
          currency: checkout.currency,
          order_id: checkout.orderId,
          name: "Wayfleet",
          description: "Booking payment",
          handler: (response) => {
            void (async () => {
              try {
                const verified = await requestPaymentApi("/api/payments/verify", {
                  method: "POST",
                  body: JSON.stringify({
                    bookingId,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                });
                if (!verified.body.success) {
                  reject(new Error(verified.body.error));
                  return;
                }
                resolve();
              } catch (verifyError) {
                reject(verifyError);
              }
            })();
          },
          modal: {
            ondismiss: () => reject(new Error("Checkout closed")),
          },
          theme: { color: "#0f2744" },
        });
        instance.on("payment.failed", () => {
          reject(new Error("Payment was not completed"));
        });
        instance.open();
      });
      router.refresh();
    } catch (checkoutError) {
      const message =
        checkoutError instanceof Error && checkoutError.message === "Checkout closed"
          ? undefined
          : checkoutError instanceof Error
            ? checkoutError.message
            : "Could not start payment.";
      if (message) {
        setError(message);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const showPay =
    audience === "customer" &&
    bookingStatusEligible &&
    (paymentStatus === "unpaid" || paymentStatus === "failed");
  const showContinue =
    audience === "customer" &&
    bookingStatusEligible &&
    paymentStatus === "pending";

  return (
    <BookingPaymentDetails
      amount={amount}
      currency={currency}
      paymentStatus={paymentStatus}
      payment={payment}
      audience={audience}
    >
      {audience === "customer" && (showPay || showContinue) ? (
        <div className="mt-4">
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              void startCheckout();
            }}
          >
            {busy
              ? "Working…"
              : showContinue
                ? "Continue payment"
                : paymentStatus === "failed"
                  ? "Retry payment"
                  : "Pay Now"}
          </Button>
        </div>
      ) : null}
      {audience === "customer" &&
      !bookingStatusEligible &&
      paymentStatus !== "paid" ? (
        <p className="mt-3 text-sm text-muted">
          This booking cannot be paid in its current state.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </BookingPaymentDetails>
  );
}
