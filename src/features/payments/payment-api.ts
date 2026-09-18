import type { FieldErrors } from "@/lib/validation/auth-input";
import type { CheckoutDto, PaymentVerifyDto, SafePaymentDto } from "@/server/payments/dto";

export type PaymentApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      fields?: FieldErrors;
    };

export async function requestPaymentApi<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: PaymentApiResponse<T> }> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as PaymentApiResponse<T>;
  return { status: response.status, body };
}

export type { CheckoutDto, PaymentVerifyDto, SafePaymentDto };
