# Booking system

Milestone 7 adds a MongoDB-backed booking lifecycle. Milestone 8 collects payment for existing bookings through Razorpay. Milestone 10 adds live GPS tracking for `confirmed` and `in_progress` bookings. Reviews and notifications are not included.

## Lifecycle

```
pending → confirmed → in_progress → completed
   │          │
   ├→ rejected
   └→ cancelled
              └→ cancelled
```

| From | Action | Actor | To |
| --- | --- | --- | --- |
| pending | confirm | vendor | confirmed |
| pending | reject | vendor | rejected |
| pending | cancel | customer | cancelled |
| confirmed | start | vendor | in_progress |
| confirmed | cancel | customer | cancelled |
| in_progress | complete | vendor | completed |

`rejected`, `cancelled`, and `completed` are terminal. Invalid transitions return `409` with `BOOKING_INVALID_TRANSITION`.

Booking status and payment status are separate. New bookings are `bookingStatus: pending` and `paymentStatus: unpaid`. Payment success sets `paymentStatus` to `paid` and does not change `bookingStatus`. See `docs/PAYMENTS.md`.

## Why snapshots exist

A booking stores `snapshot.vehicleDisplayName`, `snapshot.vendorBusinessName`, the agreed unit rate, currency, and unit. The total `amount` is also stored. If a vendor later changes the listing price or business name, existing bookings keep the agreement from create time. Snapshots do not copy passwords, KYC, contact records, or registration numbers.

## Price calculation

The client cannot set `amount`. The server reads the vehicle's `pricing` document:

| Unit | Rule |
| --- | --- |
| `day` | `unitAmount * max(1, ceil(duration / 24h))` |
| `hour` | `unitAmount * max(1, ceil(duration / 1h))` |
| `trip` | `unitAmount` once |

Amounts stay integer minor units (paise for INR). The form may preview the same formula; the stored total is always recalculated on the server.

## Availability vs reservations

`Vehicle.availability` (`available` / `unavailable` / `maintenance`) is an operator switch. Creating a booking does **not** flip it to unavailable.

A vehicle can be booked only when:

1. `status === active`
2. `availability === available`
3. no overlapping **blocking** booking exists

Blocking statuses: `pending`, `confirmed`, `in_progress`. `rejected`, `cancelled`, and `completed` do not hold the calendar.

Overlap:

```
existing.startsAt < requested.endsAt
AND existing.endsAt > requested.startsAt
```

Adjacent windows that only touch at the endpoint are allowed.

## Authorization

The server never trusts `customerId` or `vendorId` in the body.

- Create: `requireRole("customer")`. Customer and vendor ids come from the session and the vehicle document.
- List/detail: customers see only `booking.customer === user.id`. Vendors see only `booking.vendor === vendor._id` for their profile.
- Customer cancel / vendor confirm, reject, start, complete are enforced by the state machine and ownership checks.

Vendors see customer name and email on a booking they own so they can fulfill it. Customers see the vendor business name from the snapshot, not vendor contact or KYC.

## Cancellation

Customers may cancel `pending` or `confirmed` bookings. Completed, rejected, cancelled, and in-progress bookings cannot be cancelled. The document stores `cancellation.cancelledAt`, `cancelledBy`, `cancelledByRole`, and optional `reason`. Vendors do not cancel in this milestone; they reject pending requests instead.

## Concurrency

Create does a conflict query, inserts the booking, then counts overlapping blocking rows again. If another request landed in between, the new document is deleted and the API returns `409 BOOKING_CONFLICT`.

This is not a fully atomic reservation. Two inserts can still interleave on a standalone node or without a replica-set transaction. Atlas multi-document transactions would make the check+insert+recheck a single commit; that is the recommended follow-up if double-booking under load becomes a problem.

## HTTP API

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/api/bookings` | Customer |
| `GET` | `/api/bookings` | Customer or vendor (own rows) |
| `GET` | `/api/bookings/[id]` | Owner customer or vendor |
| `PATCH` | `/api/bookings/[id]` | Owner, via `{ "action": "confirm" \| "reject" \| "start" \| "complete" \| "cancel" }` |

### Create body

```json
{
  "vehicleId": "507f1f77bcf86cd799439011",
  "pickup": {
    "address": "Pune Airport",
    "city": "Pune",
    "latitude": 18.5793,
    "longitude": 73.9089
  },
  "destination": {
    "address": "Koregaon Park",
    "city": "Pune",
    "latitude": 18.5362,
    "longitude": 73.8938
  },
  "startsAt": "2026-09-10T10:00:00.000Z",
  "endsAt": "2026-09-11T10:00:00.000Z"
}
```

Rejected if start is in the past, end ≤ start, duration > 30 days, vehicle is inactive/unavailable, or the window overlaps a blocking booking.

### List query

Allowlisted: `status`, `page`, `limit` (max 50), `sort` (`createdAt` | `startsAt`). Mongo operators are rejected.

### Errors

| Status | Meaning |
| --- | --- |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 400 | Invalid id or query |
| 404 | Booking or vehicle not found |
| 409 | `BOOKING_CONFLICT` or `BOOKING_INVALID_TRANSITION` |
| 422 | Validation |
| 503 | Database unavailable |

## Indexes

`{ customer, createdAt }`, `{ vendor, bookingStatus }`, `{ startsAt, bookingStatus }`, `{ vehicle, startsAt, endsAt, bookingStatus }`.
