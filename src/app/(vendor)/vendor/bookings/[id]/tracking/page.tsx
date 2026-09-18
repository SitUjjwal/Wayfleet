import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorTrackingPanel } from "@/components/tracking/vendor-tracking-panel";
import { getCurrentUser } from "@/server/auth/guards";
import { BookingHttpError } from "@/server/bookings/errors";
import { getBookingForUser } from "@/server/bookings/service";
import { TrackingHttpError } from "@/server/tracking/errors";
import { getTrackingSnapshotForUser } from "@/server/tracking/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function VendorBookingTrackingPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }
  const id = (await params).id;
  let booking;
  try {
    booking = await getBookingForUser(user, id);
  } catch (error) {
    if (
      error instanceof BookingHttpError &&
      (error.status === 404 || error.status === 400 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  }

  let snapshot;
  try {
    snapshot = await getTrackingSnapshotForUser(user, id);
  } catch (error) {
    if (error instanceof TrackingHttpError && error.status === 403) {
      notFound();
    }
    throw error;
  }

  return (
    <section className="space-y-4">
      <p className="text-sm">
        <Link href={`/vendor/bookings/${booking.id}`} className="text-navy underline">
          Back to booking
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-navy">Trip tracking</h1>
      <VendorTrackingPanel
        bookingId={booking.id}
        vehicleName={booking.vehicle.displayName}
        initial={snapshot}
      />
    </section>
  );
}
