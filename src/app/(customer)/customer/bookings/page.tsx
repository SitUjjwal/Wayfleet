import { BookingList } from "@/components/booking/booking-list";
import { ErrorState } from "@/components/feedback/error-state";
import { getCurrentUser } from "@/server/auth/guards";
import { DEFAULT_BOOKING_LIST_QUERY } from "@/server/bookings/list-query";
import { listBookingsForUser } from "@/server/bookings/service";
import type { BookingListItem } from "@/features/bookings/types";

export const dynamic = "force-dynamic";

export default async function CustomerBookingsPage() {
  const user = await getCurrentUser();
  let bookings: BookingListItem[] = [];
  let loadError: string | undefined;

  if (user) {
    try {
      const result = await listBookingsForUser(user, {
        ...DEFAULT_BOOKING_LIST_QUERY,
        limit: 50,
      });
      bookings = result.data;
    } catch {
      loadError = "Could not load bookings.";
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Bookings</h1>
        <p className="mt-1 text-sm text-muted">
          Requests you have submitted. Status updates when the vendor responds.
        </p>
      </div>
      {loadError ? (
        <ErrorState title="Could not load bookings" description={loadError} />
      ) : (
        <BookingList
          bookings={bookings}
          hrefFor={(id) => `/customer/bookings/${id}`}
          emptyDescription="Book a vehicle to see it here. Nothing is fabricated."
        />
      )}
    </section>
  );
}
