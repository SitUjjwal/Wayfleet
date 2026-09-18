import { requireRole } from "@/server/auth/guards";
import { apiSuccess } from "@/lib/http/api-response";
import { VehicleHttpError } from "@/server/vehicles/errors";
import { vehicleRouteError } from "@/server/vehicles/http";
import { parseVehicleListQuery } from "@/server/vehicles/list-query";
import {
  createVehicleForVendor,
  listPublicVehicles,
  listVendorVehicles,
} from "@/server/vehicles/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new VehicleHttpError(422, "Validation error");
  }
}

export async function GET(request: Request) {
  try {
    const query = parseVehicleListQuery(new URL(request.url).searchParams);
    if (query.mine) {
      const user = await requireRole("vendor");
      const result = await listVendorVehicles(user, query);
      return apiSuccess(result.data, { pagination: result.pagination });
    }
    const result = await listPublicVehicles(query);
    return apiSuccess(result.data, { pagination: result.pagination });
  } catch (error) {
    return vehicleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("vendor");
    const body = await readJsonBody(request);
    const data = await createVehicleForVendor(user, body);
    return apiSuccess(data, { status: 201 });
  } catch (error) {
    return vehicleRouteError(error);
  }
}
