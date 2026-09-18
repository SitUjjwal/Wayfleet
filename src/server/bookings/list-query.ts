import { isBookingStatus } from "@/lib/labels";
import { BookingHttpError } from "@/server/bookings/errors";
import type { BookingStatus } from "@/types/domain";

export const MAX_BOOKING_PAGE_LIMIT = 50;
export const DEFAULT_BOOKING_PAGE_LIMIT = 12;

export const BOOKING_SORTS = ["createdAt", "startsAt"] as const;
export type BookingListSort = (typeof BOOKING_SORTS)[number];

export const ALLOWED_BOOKING_QUERY_KEYS = new Set([
  "status",
  "page",
  "limit",
  "sort",
]);

export type BookingListQuery = {
  status: BookingStatus | null;
  page: number;
  limit: number;
  sort: BookingListSort;
};

const FORBIDDEN_KEY = /[$[\]\.]/;
const FORBIDDEN_VALUE = /\$[a-zA-Z]/;

function rejectUnsafe(entries: Iterable<[string, string]>): void {
  for (const [key, value] of entries) {
    if (
      !ALLOWED_BOOKING_QUERY_KEYS.has(key) ||
      FORBIDDEN_KEY.test(key) ||
      FORBIDDEN_VALUE.test(value)
    ) {
      throw new BookingHttpError(400, "Unsupported query parameter");
    }
  }
}

function readInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new BookingHttpError(400, "Invalid numeric query parameter");
  }
  return parsed;
}

export const DEFAULT_BOOKING_LIST_QUERY: BookingListQuery = {
  status: null,
  page: 1,
  limit: DEFAULT_BOOKING_PAGE_LIMIT,
  sort: "createdAt",
};

export function parseBookingListQuery(searchParams: URLSearchParams): BookingListQuery {
  rejectUnsafe(searchParams.entries());
  const statusRaw = searchParams.get("status");
  const sortRaw = searchParams.get("sort") ?? "createdAt";
  const page = Math.max(1, readInt(searchParams.get("page"), 1));
  const limit = Math.min(
    MAX_BOOKING_PAGE_LIMIT,
    Math.max(1, readInt(searchParams.get("limit"), DEFAULT_BOOKING_PAGE_LIMIT)),
  );
  if (sortRaw && !(BOOKING_SORTS as readonly string[]).includes(sortRaw)) {
    throw new BookingHttpError(400, "Unsupported sort field");
  }
  return {
    status: statusRaw && isBookingStatus(statusRaw) ? statusRaw : null,
    page,
    limit,
    sort: (BOOKING_SORTS as readonly string[]).includes(sortRaw)
      ? (sortRaw as BookingListSort)
      : "createdAt",
  };
}

export function bookingMongoSort(sort: BookingListSort): Record<string, -1> {
  return sort === "startsAt" ? { startsAt: -1 } : { createdAt: -1 };
}
