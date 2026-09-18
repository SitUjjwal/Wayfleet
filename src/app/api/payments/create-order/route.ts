import { requireRole } from "@/server/auth/guards";
import { apiSuccess } from "@/lib/http/api-response";
import { PaymentHttpError } from "@/server/payments/errors";
import { paymentRouteError } from "@/server/payments/http";
import { createPaymentOrderForCustomer } from "@/server/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new PaymentHttpError(422, "Validation error");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("customer");
    const body = await readJsonBody(request);
    const data = await createPaymentOrderForCustomer(user, body);
    return apiSuccess(data);
  } catch (error) {
    return paymentRouteError(error);
  }
}
