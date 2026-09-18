import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <p className="text-sm font-semibold tracking-tight">Wayfleet</p>
          <p className="max-w-xs text-sm leading-6 text-white/65">
            Book vehicles, run a fleet, and track trips in one marketplace.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-white/65">
            <li>
              <Link href="/#how-it-works" className="hover:text-white">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/vehicles" className="hover:text-white">
                Browse fleet
              </Link>
            </li>
            <li>
              <Link href="/#vehicles" className="hover:text-white">
                Vehicle types
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Coming later</p>
          <ul className="mt-3 space-y-2 text-sm text-white/65">
            <li>Driving directions and ETA</li>
            <li>Vendor earnings and payouts</li>
            <li>In-app chat and reviews</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Wayfleet. All rights reserved.</p>
          <p>Live bookings, payments, maps, and trip tracking.</p>
        </div>
      </div>
    </footer>
  );
}
