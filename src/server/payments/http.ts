import { AuthHttpError } from "@/server/auth/http-error";
import { apiError } from "@/lib/http/api-response";
import { sanitizeDbError } from "@/lib/db/connect";
import { BookingHttpError } from "@/server/bookings/errors";
import { PaymentHttpError } from "@/server/payments/errors";

export function paymentRouteError(error: unknown) {
  if (error instanceof AuthHttpError) {
    return apiError(
      error.status,
      error.status === 401 ? "Unauthenticated" : "Forbidden",
    );
  }
  if (error instanceof PaymentHttpError || error instanceof BookingHttpError) {
    return apiError(error.status, error.message, error.fields);
  }
  console.error("Payment API error", { message: sanitizeDbError(error) });
  return apiError(500, "Internal server error");
}
