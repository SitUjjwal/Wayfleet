import { EmptyState } from "@/components/feedback/empty-state";
import { DemoBanner } from "@/components/ui/demo-banner";

export function ComingSoonPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
      <DemoBanner>
        This screen is a UI placeholder. It does not load live records.
      </DemoBanner>
      <EmptyState title={`No ${title.toLowerCase()} yet.`} description={description} />
    </div>
  );
}
