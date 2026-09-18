import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingDetail } from "@/components/booking/booking-detail";
import { getCurrentUser } from "@/server/auth/guards";
import { BookingHttpError } from "@/server/bookings/errors";
import { getBookingForUser } from "@/server/bookings/service";
import { findSafePaymentForUser } from "@/server/payments/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function VendorBookingDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  let booking;
  try {
    booking = await getBookingForUser(user, (await params).id);
  } catch (error) {
    if (
      error instanceof BookingHttpError &&
      (error.status === 404 || error.status === 400 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <section className="space-y-4">
      <p className="text-sm">
        <Link href="/vendor/bookings" className="text-navy underline">
          Back to bookings
        </Link>
      </p>
      <BookingDetail
        booking={booking}
        audience="vendor"
        payment={await findSafePaymentForUser(user, booking.id)}
      />
    </section>
  );
}
