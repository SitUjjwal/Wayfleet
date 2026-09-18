import { EmptyState } from "@/components/feedback/empty-state";
import { ButtonLink } from "@/components/ui/button";

export default function VehicleNotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        title="Vehicle not found."
        description="This listing is missing, inactive, or the link is invalid."
        action={
          <ButtonLink href="/vehicles" variant="secondary">
            Back to fleet
          </ButtonLink>
        }
      />
    </section>
  );
}
