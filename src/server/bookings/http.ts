import { AuthHttpError } from "@/server/auth/http-error";
import { apiError } from "@/lib/http/api-response";
import { sanitizeDbError } from "@/lib/db/connect";
import { BookingHttpError } from "@/server/bookings/errors";
import { VehicleHttpError } from "@/server/vehicles/errors";

export function bookingRouteError(error: unknown) {
  if (error instanceof AuthHttpError) {
    return apiError(
      error.status,
      error.status === 401 ? "Unauthenticated" : "Forbidden",
    );
  }
  if (error instanceof BookingHttpError || error instanceof VehicleHttpError) {
    return apiError(error.status, error.message, error.fields);
  }
  console.error("Booking API error", { message: sanitizeDbError(error) });
  return apiError(500, "Internal server error");
}
