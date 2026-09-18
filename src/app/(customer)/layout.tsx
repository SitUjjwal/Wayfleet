import { requirePageRole } from "@/server/auth/guards";
import {
  CUSTOMER_NAV,
  DashboardShell,
} from "@/components/layout/dashboard-shell";

export default async function CustomerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRole("customer", "/customer");
  return (
    <DashboardShell title="Customer" nav={CUSTOMER_NAV}>
      {children}
    </DashboardShell>
  );
}
