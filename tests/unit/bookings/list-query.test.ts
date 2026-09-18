import { describe, expect, it } from "vitest";
import { MAX_BOOKING_PAGE_LIMIT, parseBookingListQuery } from "@/server/bookings/list-query";
import { BookingHttpError } from "@/server/bookings/errors";

describe("booking list query", () => {
  it("parses allowlisted filters and clamps the page size", () => {
    const query = parseBookingListQuery(
      new URLSearchParams("status=pending&sort=startsAt&page=2&limit=999"),
    );
    expect(query.status).toBe("pending");
    expect(query.sort).toBe("startsAt");
    expect(query.page).toBe(2);
    expect(query.limit).toBe(MAX_BOOKING_PAGE_LIMIT);
  });

  it("rejects Mongo operators and unknown sort fields", () => {
    expect(() => parseBookingListQuery(new URLSearchParams("$where=true"))).toThrow(
      BookingHttpError,
    );
    expect(() => parseBookingListQuery(new URLSearchParams("sort=amount"))).toThrow(
      BookingHttpError,
    );
  });
});
