import Link from "next/link";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { ButtonLink } from "@/components/ui/button";
import type { BookingListItem } from "@/features/bookings/types";
import { formatMinorUnits } from "@/lib/money";

export function BookingList({
  bookings,
  hrefFor,
  emptyDescription,
}: {
  bookings: BookingListItem[];
  hrefFor: (id: string) => string;
  emptyDescription: string;
}) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No bookings yet."
        description={emptyDescription}
        action={
          <ButtonLink href="/vehicles" variant="secondary">
            Browse fleet
          </ButtonLink>
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {bookings.map((booking) => (
        <li key={booking.id}>
          <Link
            href={hrefFor(booking.id)}
            className="block rounded-xl border border-line bg-paper-strong p-4 hover:bg-paper"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-navy">{booking.vehicle.displayName}</p>
                <p className="mt-1 text-sm text-muted">
                  {booking.vendor.businessName}
                  {booking.customer ? ` · ${booking.customer.name}` : ""}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {new Date(booking.startsAt).toLocaleString()} →{" "}
                  {new Date(booking.endsAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <BookingStatusBadge status={booking.bookingStatus} />
                <p className="mt-2 text-sm font-medium text-navy">
                  {formatMinorUnits(booking.amount, booking.currency)}
                </p>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
