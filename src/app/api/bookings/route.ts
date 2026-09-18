import { requireAuth, requireRole } from "@/server/auth/guards";
import { apiSuccess } from "@/lib/http/api-response";
import { BookingHttpError } from "@/server/bookings/errors";
import { bookingRouteError } from "@/server/bookings/http";
import { parseBookingListQuery } from "@/server/bookings/list-query";
import {
  createBookingForCustomer,
  listBookingsForUser,
} from "@/server/bookings/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BookingHttpError(422, "Validation error");
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const query = parseBookingListQuery(new URL(request.url).searchParams);
    const result = await listBookingsForUser(user, query);
    return apiSuccess(result.data, { pagination: result.pagination });
  } catch (error) {
    return bookingRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("customer");
    const body = await readJsonBody(request);
    const data = await createBookingForCustomer(user, body);
    return apiSuccess(data, { status: 201 });
  } catch (error) {
    return bookingRouteError(error);
  }
}
