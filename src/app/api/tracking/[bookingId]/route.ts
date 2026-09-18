import { requireAuth } from "@/server/auth/guards";
import { apiSuccess } from "@/lib/http/api-response";
import { trackingRouteError } from "@/server/tracking/http";
import { getTrackingSnapshotForUser } from "@/server/tracking/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { bookingId } = await context.params;
    const data = await getTrackingSnapshotForUser(user, bookingId);
    return apiSuccess(data);
  } catch (error) {
    return trackingRouteError(error);
  }
}
