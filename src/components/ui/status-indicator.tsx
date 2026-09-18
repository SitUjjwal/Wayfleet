import type { VehicleAvailability } from "@/types/domain";
import { AVAILABILITY_LABELS } from "@/lib/labels";

const TONE: Record<VehicleAvailability, string> = {
  available: "bg-success",
  unavailable: "bg-muted",
  maintenance: "bg-warning",
};

export function StatusIndicator({
  availability,
}: {
  availability: VehicleAvailability;
}) {
  const label = AVAILABILITY_LABELS[availability];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink">
      <span
        className={`h-2 w-2 rounded-full ${TONE[availability]}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
