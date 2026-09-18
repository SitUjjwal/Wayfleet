import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-navy">{value}</p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </Card>
  );
}

export function QuickActions({
  actions,
}: {
  actions: { href: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <ButtonLink key={action.href} href={action.href} variant="secondary">
          {action.label}
        </ButtonLink>
      ))}
    </div>
  );
}
