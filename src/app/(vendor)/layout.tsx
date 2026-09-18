import { requirePageRole } from "@/server/auth/guards";
import { DashboardShell, VENDOR_NAV } from "@/components/layout/dashboard-shell";

export default async function VendorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRole("vendor", "/vendor");
  return (
    <DashboardShell title="Vendor" nav={VENDOR_NAV}>
      {children}
    </DashboardShell>
  );
}
