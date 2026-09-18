import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_LABELS } from "@/lib/labels";
import type { BookingStatus } from "@/types/domain";

const TONE: Record<BookingStatus, "neutral" | "success" | "warning" | "danger"> = {
  pending: "warning",
  confirmed: "success",
  rejected: "danger",
  cancelled: "neutral",
  in_progress: "warning",
  completed: "success",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={TONE[status]}>{BOOKING_STATUS_LABELS[status]}</Badge>;
}
