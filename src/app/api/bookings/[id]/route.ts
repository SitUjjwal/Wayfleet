import { requireAuth } from "@/server/auth/guards";
import { apiSuccess } from "@/lib/http/api-response";
import { BookingHttpError } from "@/server/bookings/errors";
import { bookingRouteError } from "@/server/bookings/http";
import {
  getBookingForUser,
  transitionBookingForUser,
} from "@/server/bookings/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BookingHttpError(422, "Validation error");
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;
    const data = await getBookingForUser(user, id);
    return apiSuccess(data);
  } catch (error) {
    return bookingRouteError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;
    const body = await readJsonBody(request);
    const data = await transitionBookingForUser(user, id, body);
    return apiSuccess(data);
  } catch (error) {
    return bookingRouteError(error);
  }
}
