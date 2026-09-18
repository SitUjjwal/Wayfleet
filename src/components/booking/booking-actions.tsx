"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestBookingApi } from "@/features/bookings/booking-api";
import type { BookingAction } from "@/lib/booking/transitions";
import type { BookingStatus } from "@/types/domain";

const ACTION_COPY: Record<
  BookingAction,
  { label: string; confirm: string; variant: "primary" | "secondary" | "danger" }
> = {
  confirm: {
    label: "Confirm",
    confirm: "Accept this booking request?",
    variant: "primary",
  },
  reject: {
    label: "Reject",
    confirm: "Reject this booking? The customer will see a rejected status.",
    variant: "danger",
  },
  start: {
    label: "Start trip",
    confirm: "Mark this trip as in progress?",
    variant: "primary",
  },
  complete: {
    label: "Complete trip",
    confirm: "Mark this trip as completed? This cannot be undone.",
    variant: "primary",
  },
  cancel: {
    label: "Cancel booking",
    confirm: "Cancel this booking? This cannot be undone.",
    variant: "danger",
  },
};

export function BookingActionButtons({
  bookingId,
  status,
  audience,
}: {
  bookingId: string;
  status: BookingStatus;
  audience: "customer" | "vendor";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState<BookingAction | null>(null);

  const actions: BookingAction[] = [];
  if (audience === "vendor") {
    if (status === "pending") {
      actions.push("confirm", "reject");
    }
    if (status === "confirmed") {
      actions.push("start");
    }
    if (status === "in_progress") {
      actions.push("complete");
    }
  }
  if (audience === "customer" && (status === "pending" || status === "confirmed")) {
    actions.push("cancel");
  }

  if (actions.length === 0) {
    return null;
  }

  async function run(action: BookingAction) {
    setPending(true);
    setError(undefined);
    try {
      const { body } = await requestBookingApi(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (!body.success) {
        setError(body.error);
        setConfirming(null);
        return;
      }
      setConfirming(null);
      router.refresh();
    } catch {
      setError("Could not update the booking.");
      setConfirming(null);
    } finally {
      setPending(false);
    }
  }

  const dialog = confirming ? ACTION_COPY[confirming] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            type="button"
            variant={ACTION_COPY[action].variant}
            disabled={pending}
            onClick={() => setConfirming(action)}
          >
            {ACTION_COPY[action].label}
          </Button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error === "BOOKING_INVALID_TRANSITION"
            ? "That status change is not allowed."
            : error}
        </p>
      ) : null}
      {dialog && confirming ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-action-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-md rounded-xl border border-line bg-paper-strong p-6">
            <h2 id="booking-action-title" className="text-lg font-semibold text-navy">
              {dialog.label}
            </h2>
            <p className="mt-2 text-sm text-muted">{dialog.confirm}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={dialog.variant}
                disabled={pending}
                onClick={() => {
                  void run(confirming);
                }}
              >
                {pending ? "Working…" : dialog.label}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirming(null)}
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
