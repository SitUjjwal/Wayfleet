import { apiSuccess } from "@/lib/http/api-response";
import { paymentRouteError } from "@/server/payments/http";
import { processPaymentWebhook } from "@/server/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const data = await processPaymentWebhook(rawBody, signature);
    return apiSuccess(data);
  } catch (error) {
    return paymentRouteError(error);
  }
}
