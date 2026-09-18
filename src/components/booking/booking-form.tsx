"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LocationPicker } from "@/components/maps/location-picker";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { requestBookingApi } from "@/features/bookings/booking-api";
import { calculateBookingAmount } from "@/lib/booking/pricing";
import type { LocationInput } from "@/lib/geo/types";
import { formatMinorUnits } from "@/lib/money";
import type { FieldErrors } from "@/lib/validation/auth-input";
import type { PricingUnit } from "@/types/domain";

function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function BookingForm({
  vehicleId,
  vehicleName,
  unitAmount,
  currency,
  unit,
  canBook,
  unavailableReason,
  signedIn,
  isCustomer,
}: {
  vehicleId: string;
  vehicleName: string;
  unitAmount: number;
  currency: string;
  unit: PricingUnit;
  canBook: boolean;
  unavailableReason?: string;
  signedIn: boolean;
  isCustomer: boolean;
}) {
  const router = useRouter();
  const defaultStart = useMemo(() => {
    const start = new Date();
    start.setMinutes(start.getMinutes() + 30, 0, 0);
    return start;
  }, []);
  const defaultEnd = useMemo(() => {
    const end = new Date(defaultStart);
    end.setDate(end.getDate() + 1);
    return end;
  }, [defaultStart]);

  const [startsAt, setStartsAt] = useState(toDateTimeLocalValue(defaultStart));
  const [endsAt, setEndsAt] = useState(toDateTimeLocalValue(defaultEnd));
  const [pickup, setPickup] = useState<LocationInput | null>(null);
  const [destination, setDestination] = useState<LocationInput | null>(null);
  const [errors, setErrors] = useState<FieldErrors>();
  const [notice, setNotice] = useState<string>();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const previewAmount = useMemo(() => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null;
    }
    return calculateBookingAmount({ unitAmount, unit, startsAt: start, endsAt: end });
  }, [startsAt, endsAt, unitAmount, unit]);

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-line bg-paper-strong p-5">
        <h2 className="text-lg font-semibold text-navy">Book this vehicle</h2>
        <p className="mt-2 text-sm text-muted">
          Sign in as a customer to request {vehicleName}. No payment is taken.
        </p>
        <ButtonLink href={`/login?callbackUrl=/vehicles/${vehicleId}`} className="mt-4">
          Sign in to book
        </ButtonLink>
      </div>
    );
  }

  if (!isCustomer) {
    return (
      <p className="text-sm text-muted">
        Booking requests are created from a customer account.
      </p>
    );
  }

  if (!canBook) {
    return (
      <ErrorState
        title="This vehicle cannot be booked"
        description={unavailableReason ?? "The listing is inactive or marked unavailable."}
      />
    );
  }

  async function submit() {
    setPending(true);
    setNotice(undefined);
    try {
      const { body } = await requestBookingApi<{ id: string }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          vehicleId,
          pickup,
          destination,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        }),
      });
      if (!body.success) {
        setErrors(body.fields);
        setNotice(body.error);
        setConfirming(false);
        return;
      }
      router.push(`/customer/bookings/${body.data.id}`);
      router.refresh();
    } catch {
      setNotice("Could not create the booking. Try again.");
      setConfirming(false);
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!pickup) {
      nextErrors.pickup = "Select a pickup location";
    }
    if (!destination) {
      nextErrors.destination = "Select a destination";
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime())) {
      nextErrors.startsAt = "Enter a valid start time";
    }
    if (Number.isNaN(end.getTime()) || end <= start) {
      nextErrors.endsAt = "End time must be after the start time";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors(undefined);
    setConfirming(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-line bg-paper-strong p-5"
      data-booking-form="api"
    >
      <h2 className="text-lg font-semibold text-navy">Book {vehicleName}</h2>
      <p className="text-sm text-muted">
        Price is calculated from the listed {unit} rate. Payment is not collected.
      </p>
      <LocationPicker
        id="pickup"
        label="Pickup location"
        value={pickup}
        error={errors?.pickup}
        onChange={setPickup}
      />
      <LocationPicker
        id="destination"
        label="Destination"
        value={destination}
        error={errors?.destination}
        onChange={setDestination}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="startsAt" className="block text-sm font-medium text-navy">
            Start
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm outline-none ring-navy focus:ring-2"
          />
          {errors?.startsAt ? (
            <p className="text-sm text-danger">{errors.startsAt}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="endsAt" className="block text-sm font-medium text-navy">
            End
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="w-full rounded-md border border-line bg-paper-strong px-3 py-2 text-sm outline-none ring-navy focus:ring-2"
          />
          {errors?.endsAt ? (
            <p className="text-sm text-danger">{errors.endsAt}</p>
          ) : null}
        </div>
      </div>
      <p className="text-sm font-medium text-navy" data-booking-preview-price>
        {previewAmount === null
          ? "Enter a valid window to see the price"
          : `Estimated total ${formatMinorUnits(previewAmount, currency)}`}
      </p>
      {notice ? (
        <p role="alert" className="text-sm text-danger">
          {notice}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        Review booking
      </Button>
      {confirming ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-confirm-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-md rounded-xl border border-line bg-paper-strong p-6">
            <h3 id="booking-confirm-title" className="text-lg font-semibold text-navy">
              Confirm request
            </h3>
            <p className="mt-2 text-sm text-muted">
              Submit a pending request for {vehicleName}. The vendor can accept or
              reject it. No payment is taken.
            </p>
            {previewAmount !== null ? (
              <p className="mt-3 font-medium text-navy">
                {formatMinorUnits(previewAmount, currency)}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  void submit();
                }}
              >
                {pending ? "Submitting…" : "Confirm booking"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
