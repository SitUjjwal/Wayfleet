import Link from "next/link";
import { getCurrentUser } from "@/server/auth/guards";
import { QuickActions, StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { ButtonLink } from "@/components/ui/button";
import { MotionSection } from "@/components/ui/motion-section";
import { VehicleCard } from "@/components/marketplace/vehicle-card";
import { CategorySelector } from "@/components/marketplace/vehicle-search";
import { BookingList } from "@/components/booking/booking-list";
import { DEFAULT_BOOKING_LIST_QUERY } from "@/server/bookings/list-query";
import { listBookingsForUser } from "@/server/bookings/service";
import { toCatalogVehicle } from "@/server/vehicles/dto";
import { DEFAULT_VEHICLE_LIST_QUERY } from "@/server/vehicles/list-query";
import { listPublicVehicles } from "@/server/vehicles/service";
import type { BookingListItem } from "@/features/bookings/types";
import { CATEGORY_LABELS } from "@/lib/labels";
import { VEHICLE_CATEGORIES } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage() {
  const user = await getCurrentUser();
  let recommended: ReturnType<typeof toCatalogVehicle>[] = [];
  let recentBookings: BookingListItem[] = [];
  let loadError: string | undefined;

  try {
    const result = await listPublicVehicles({
      ...DEFAULT_VEHICLE_LIST_QUERY,
      sort: "recommended",
      limit: 3,
    });
    recommended = result.data.map(toCatalogVehicle);
  } catch {
    loadError = "Could not load recommended vehicles.";
  }

  if (user) {
    try {
      const bookings = await listBookingsForUser(user, {
        ...DEFAULT_BOOKING_LIST_QUERY,
        limit: 3,
      });
      recentBookings = bookings.data;
    } catch {
      recentBookings = [];
    }
  }

  return (
    <MotionSection className="space-y-8">
      <section className="rounded-2xl border border-line bg-paper-strong p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-copper">
          Customer
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Search the fleet and request a booking. Nothing here charges a payment.
        </p>
        <form
          action="/vehicles"
          method="get"
          className="mt-6 grid gap-3 sm:grid-cols-[1fr_12rem_auto]"
        >
          <label className="sr-only" htmlFor="customer-q">
            Search vehicles
          </label>
          <input
            id="customer-q"
            name="q"
            type="search"
            placeholder="Try Innova, Pune, or a brand"
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none ring-navy focus:ring-2"
          />
          <CategorySelector id="customer-category" includeAll />
          <button
            type="submit"
            className="rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-paper-strong hover:bg-navy-deep"
          >
            Search
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-navy">Popular categories</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VEHICLE_CATEGORIES.filter((category) => category !== "other").map(
            (category) => (
              <li key={category}>
                <Link
                  href={`/vehicles?category=${category}`}
                  className="block rounded-xl border border-line bg-paper-strong px-4 py-5 text-sm font-medium text-navy hover:bg-paper"
                >
                  {CATEGORY_LABELS[category]}
                </Link>
              </li>
            ),
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold text-navy">Recommended vehicles</h2>
          <ButtonLink href="/vehicles" variant="ghost" className="px-0">
            View all
          </ButtonLink>
        </div>
        {loadError ? (
          <ErrorState title="Could not load vehicles" description={loadError} />
        ) : recommended.length === 0 ? (
          <EmptyState
            title="No vehicles listed yet."
            description="When vendors publish listings, they will show up here."
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-3">
            {recommended.map((vehicle) => (
              <li key={vehicle.id}>
                <VehicleCard vehicle={vehicle} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-navy">Recent bookings</h2>
          <BookingList
            bookings={recentBookings}
            hrefFor={(id) => `/customer/bookings/${id}`}
            emptyDescription="Request a vehicle to see it here. This is not a fake trip history."
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-navy">Quick actions</h2>
          <QuickActions
            actions={[
              { href: "/vehicles", label: "Search vehicles" },
              { href: "/customer/profile", label: "Profile" },
              { href: "/customer/bookings", label: "Bookings" },
            ]}
          />
          <StatCard
            label="Account"
            value={user?.email ?? "Signed in"}
            hint="Role is enforced on the server, not only in this UI."
          />
        </div>
      </section>
    </MotionSection>
  );
}
