import { getCurrentUser } from "@/server/auth/guards";
import { QuickActions, StatCard } from "@/components/dashboard/stat-card";
import { ErrorState } from "@/components/feedback/error-state";
import { MotionSection } from "@/components/ui/motion-section";
import { DEFAULT_BOOKING_LIST_QUERY } from "@/server/bookings/list-query";
import { listBookingsForUser } from "@/server/bookings/service";
import { DEFAULT_VEHICLE_LIST_QUERY } from "@/server/vehicles/list-query";
import { listVendorVehicles } from "@/server/vehicles/service";

export const dynamic = "force-dynamic";

export default async function VendorHomePage() {
  const user = await getCurrentUser();
  let total = 0;
  let active = 0;
  let available = 0;
  let pendingBookings = 0;
  let loadError: string | undefined;

  if (user) {
    try {
      const result = await listVendorVehicles(user, {
        ...DEFAULT_VEHICLE_LIST_QUERY,
        sort: "createdAt",
        limit: 50,
        mine: true,
      });
      total = result.pagination.total;
      active = result.data.filter((vehicle) => vehicle.status === "active").length;
      available = result.data.filter(
        (vehicle) =>
          vehicle.status === "active" && vehicle.availability === "available",
      ).length;
      const bookings = await listBookingsForUser(user, {
        ...DEFAULT_BOOKING_LIST_QUERY,
        status: "pending",
        limit: 50,
      });
      pendingBookings = bookings.pagination.total;
    } catch {
      loadError = "Could not load fleet counts from the database.";
    }
  }

  return (
    <MotionSection className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-copper">
          Vendor
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy">
          Fleet overview
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Counts below are read from your MongoDB listings.
        </p>
      </div>
      {loadError ? (
        <ErrorState title="Could not load fleet" description={loadError} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total vehicles" value={String(total)} hint="Including inactive listings" />
        <StatCard label="Active listings" value={String(active)} />
        <StatCard
          label="Pending bookings"
          value={String(pendingBookings)}
          hint="Requests waiting for confirm or reject."
        />
        <StatCard
          label="Earnings"
          value="—"
          hint="Razorpay and payouts are not connected."
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Verification"
          value="Unverified"
          hint="KYC is not implemented. Status is a UI placeholder."
        />
        <StatCard
          label="Available now"
          value={String(available)}
          hint="Active listings marked available."
        />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-navy">Quick actions</h2>
        <div className="mt-3">
          <QuickActions
            actions={[
              { href: "/vendor/vehicles", label: "Vehicles" },
              { href: "/vendor/bookings", label: "Bookings" },
              { href: "/vendor/earnings", label: "Earnings" },
              { href: "/vendor/verification", label: "Verification" },
            ]}
          />
        </div>
      </div>
    </MotionSection>
  );
}
