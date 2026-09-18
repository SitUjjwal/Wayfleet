import { getCurrentUser } from "@/server/auth/guards";
import { Card } from "@/components/ui/card";

export default async function CustomerProfilePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">Profile</h1>
      <Card>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-line pb-3">
            <dt className="text-muted">Name</dt>
            <dd className="font-medium text-navy">{user?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line pb-3">
            <dt className="text-muted">Email</dt>
            <dd className="font-medium text-navy">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Role</dt>
            <dd className="font-medium text-navy">{user?.role ?? "—"}</dd>
          </div>
        </dl>
      </Card>
      <p className="text-sm text-muted">
        Profile editing is not part of this milestone.
      </p>
    </div>
  );
}
