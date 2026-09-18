import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import type { SafePaymentView } from "@/features/payments/types";
import { formatMinorUnits } from "@/lib/money";
import type { PaymentStatus } from "@/types/domain";

export function paymentHeadline(status: PaymentStatus): string {
  if (status === "paid") return "Payment successful";
  if (status === "pending") return "Processing";
  if (status === "failed") return "Payment failed";
  if (status === "refunded") return "Refunded";
  return "Payment due";
}

export function BookingPaymentDetails({
  amount,
  currency,
  paymentStatus,
  payment,
  audience,
  children,
}: {
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  payment?: SafePaymentView | null;
  audience: "customer" | "vendor";
  children?: ReactNode;
}) {
  const paidAt = payment?.paidAt
    ? new Date(payment.paidAt).toLocaleString()
    : undefined;
  const reference = audience === "customer" ? payment?.reference : undefined;

  return (
    <Card>
      <h2 className="font-semibold text-navy">Payment</h2>
      <p className="mt-1 text-sm text-muted" data-payment-state={paymentStatus}>
        {paymentHeadline(paymentStatus)}
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Amount</dt>
          <dd>{formatMinorUnits(amount, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Status</dt>
          <dd>{paymentStatus}</dd>
        </div>
        {paidAt ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Paid on</dt>
            <dd>{paidAt}</dd>
          </div>
        ) : null}
        {reference ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Reference</dt>
            <dd className="break-all">{reference}</dd>
          </div>
        ) : null}
      </dl>
      {children}
    </Card>
  );
}
