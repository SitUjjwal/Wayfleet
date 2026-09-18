import { AuthHttpError } from "@/server/auth/http-error";
import { apiError } from "@/lib/http/api-response";
import { sanitizeDbError } from "@/lib/db/connect";
import { VehicleHttpError } from "@/server/vehicles/errors";

export function vehicleRouteError(error: unknown) {
  if (error instanceof AuthHttpError) {
    return apiError(
      error.status,
      error.status === 401 ? "Unauthenticated" : "Forbidden",
    );
  }
  if (error instanceof VehicleHttpError) {
    return apiError(error.status, error.message, error.fields);
  }
  console.error("Vehicle API error", { message: sanitizeDbError(error) });
  return apiError(500, "Internal server error");
}
