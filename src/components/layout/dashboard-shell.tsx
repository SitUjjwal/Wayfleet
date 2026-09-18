import Link from "next/link";
import type { ReactNode } from "react";

export type DashboardNavItem = {
  href: string;
  label: string;
};

export const CUSTOMER_NAV: DashboardNavItem[] = [
  { href: "/customer", label: "Overview" },
  { href: "/vehicles", label: "Browse fleet" },
  { href: "/customer/bookings", label: "Bookings" },
  { href: "/customer/profile", label: "Profile" },
];

export const VENDOR_NAV: DashboardNavItem[] = [
  { href: "/vendor", label: "Overview" },
  { href: "/vendor/vehicles", label: "Vehicles" },
  { href: "/vendor/bookings", label: "Bookings" },
  { href: "/vendor/earnings", label: "Earnings" },
  { href: "/vendor/verification", label: "Verification" },
];

export const ADMIN_NAV: DashboardNavItem[] = [
  { href: "/admin", label: "Overview" },
];

export function DashboardShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: DashboardNavItem[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row">
      <aside className="lg:w-52 lg:shrink-0">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-copper">
          {title}
        </p>
        <nav
          aria-label={`${title} sections`}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-2 text-sm text-navy hover:bg-paper"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
