import { requireRole } from "@/server/auth/guards";
import { apiSuccess } from "@/lib/http/api-response";
import { VehicleHttpError } from "@/server/vehicles/errors";
import { vehicleRouteError } from "@/server/vehicles/http";
import {
  getPublicVehicleById,
  inactivateVehicleForVendor,
  updateVehicleForVendor,
} from "@/server/vehicles/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new VehicleHttpError(422, "Validation error");
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const data = await getPublicVehicleById(id);
    return apiSuccess(data);
  } catch (error) {
    return vehicleRouteError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireRole("vendor");
    const { id } = await context.params;
    const body = await readJsonBody(request);
    const data = await updateVehicleForVendor(user, id, body);
    return apiSuccess(data);
  } catch (error) {
    return vehicleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireRole("vendor");
    const { id } = await context.params;
    const data = await inactivateVehicleForVendor(user, id);
    return apiSuccess(data);
  } catch (error) {
    return vehicleRouteError(error);
  }
}
