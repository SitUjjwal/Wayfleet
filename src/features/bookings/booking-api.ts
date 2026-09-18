import type { FieldErrors } from "@/lib/validation/auth-input";
import type { BookingListItem } from "@/features/bookings/types";

export type BookingApiResponse<T> =
  | {
      success: true;
      data: T;
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }
  | {
      success: false;
      error: string;
      fields?: FieldErrors;
    };

export async function requestBookingApi<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: BookingApiResponse<T> }> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as BookingApiResponse<T>;
  return { status: response.status, body };
}

export type { BookingListItem };
