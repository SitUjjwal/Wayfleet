import { requireAuth } from "@/server/auth/guards";
import { apiSuccess } from "@/lib/http/api-response";
import { paymentRouteError } from "@/server/payments/http";
import { getSafePaymentForUser } from "@/server/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const bookingId = new URL(request.url).searchParams.get("bookingId");
    const data = await getSafePaymentForUser(user, bookingId);
    return apiSuccess(data);
  } catch (error) {
    return paymentRouteError(error);
  }
}
