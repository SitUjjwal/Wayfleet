import { requireAuth } from "@/server/auth/guards";
import { apiSuccess } from "@/lib/http/api-response";
import { getRealtimeSecret } from "@/lib/realtime/config";
import { signRealtimeToken } from "@/lib/realtime/token";
import { REALTIME_TOKEN_TTL_SECONDS } from "@/lib/tracking/constants";
import { trackingRouteError } from "@/server/tracking/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const issuedAt = Date.now();
    const token = signRealtimeToken(
      { id: user.id, role: user.role, status: user.status },
      getRealtimeSecret(),
      issuedAt,
    );
    return apiSuccess({
      token,
      expiresAt: new Date(issuedAt + REALTIME_TOKEN_TTL_SECONDS * 1000).toISOString(),
    });
  } catch (error) {
    return trackingRouteError(error);
  }
}
