import { requirePageRole } from "@/server/auth/guards";
import { ADMIN_NAV, DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePageRole("admin", "/admin");
  return (
    <DashboardShell title="Admin" nav={ADMIN_NAV}>
      {children}
    </DashboardShell>
  );
}
