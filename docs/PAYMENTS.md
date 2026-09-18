# Payments

Milestone 8 wires Razorpay Checkout to the existing booking system. Maps, live tracking, vendor KYC, reviews, earnings, and notifications are not included.

## Architecture

```
Customer (owns booking)
  → POST /api/payments/create-order { bookingId }
  → Razorpay Checkout (public key + order id only)
  → POST /api/payments/verify { bookingId, razorpay_* }
  → Payment.status = paid
  → Booking.paymentStatus = paid
```

Razorpay can also confirm or fail a payment through `POST /api/payments/webhook`. Webhooks are verified independently of the browser.

The browser is never trusted for amount, booking owner, vendor, or payment success.

## Booking relationship

Each booking has at most one `payments` document (`Payment.booking` is unique).

| Field | Source |
| --- | --- |
| amount | Persisted `Booking.amount` (minor units) |
| currency | Persisted `Booking.currency` (INR) |
| customer | `Booking.customer` |
| vendor | `Booking.vendor` |

Create-order rejects `amount`, `vendorId`, `paymentStatus`, and other write keys from the client.

Booking lifecycle (`pending` → `confirmed` → …) stays independent. A successful payment sets `paymentStatus` to `paid` and does **not** change `bookingStatus`. A pending booking does not become confirmed because money arrived.

## Eligibility

A booking may be paid only when `bookingStatus` is `pending` or `confirmed`.

Vendor acceptance is **not** required before payment.

These statuses cannot be paid:

- `rejected`
- `cancelled`
- `completed`
- `in_progress`

## Payment record lifecycle

```
created → pending → paid
   │         │
   └→ failed ←┘
              └→ pending (retry creates a new Razorpay order on the same row)
paid → refunded   (reserved; no refund API in this milestone)
```

Invalid transitions return `409` with `PAYMENT_INVALID_TRANSITION`. `paid` cannot become unpaid, pending, or failed because of a later client or webhook request.

`Booking.paymentStatus` uses `unpaid | pending | paid | failed | refunded`. It is not the same enum as the payment record (`created | pending | paid | failed | refunded`).

## Create order

`POST /api/payments/create-order` requires an authenticated customer.

1. Load the booking and confirm `booking.customer === session user`.
2. Confirm the booking is payment-eligible.
3. Use the stored amount and currency.
4. Reuse a `created`/`pending` Razorpay order for the same amount when one exists.
5. Otherwise create a Razorpay order and persist `providerOrderId`.
6. Set booking `paymentStatus` to `pending`.
7. Return `{ orderId, amount, currency, keyId }`.

`RAZORPAY_KEY_SECRET` is never returned. If Razorpay is down, the API returns `502` and the booking stays unpaid.

## Signature verification

`POST /api/payments/verify` requires the same customer ownership checks.

The server verifies

`HMAC_SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)`

using Razorpay’s `validatePaymentVerification` helper. A failing signature leaves the payment pending (with a safe `failureCode` of `signature_invalid`) and returns `400`. The booking is not marked paid.

When Razorpay can be fetched, amount and currency are compared to the stored payment. Fetch failures after a valid signature do not by themselves mark the payment failed.

Duplicate verify of the same `razorpay_payment_id` is idempotent (`200`). A different payment id against an already-paid row is `409`.

## Webhooks

`POST /api/payments/webhook` is unauthenticated. The raw body is verified with

`HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)`

via `validateWebhookSignature` and the `X-Razorpay-Signature` header.

| Event | Effect |
| --- | --- |
| `payment.captured`, `order.paid` | Mark the existing payment `paid` if not already paid |
| `payment.failed` | Mark `failed` only when the payment is not already `paid` |
| Other events | Acknowledged and ignored |

Unknown `order_id` values are acknowledged (`ignored: unknown_payment`) so Razorpay does not retry forever. No new Payment row is created from a webhook. Repeated events do not create rows or change booking lifecycle.

## Idempotency

- One Payment per booking.
- Sparse unique `providerOrderId` and `providerPaymentId`.
- Usable open orders are reused.
- Verify and captured webhooks are safe to repeat.
- Paid records are not downgraded.

## Security

- `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are server-only. Never use `NEXT_PUBLIC_RAZORPAY_KEY_SECRET`.
- The public key is returned from create-order, not baked into the client bundle as a secret.
- `providerSignature` is stored with `select: false` and is omitted from API DTOs.
- Logs use sanitized database errors and never print secrets or signatures.
- Customer APIs use `requireRole("customer")`. Payment reads authorize against booking ownership. Vendors see status, amount, currency, and paid date — not Razorpay ids.

## Environment

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

Copy `.env.example` to `.env.local`. Do not commit real credentials.

Automated tests mock the Razorpay SDK and HMAC helpers. They do not call Razorpay’s live API.

## Customer UI

`/customer/bookings/[id]` reads server payment state:

| Server `paymentStatus` | UI |
| --- | --- |
| `unpaid` | Pay Now |
| `pending` | Processing (Continue payment reuses the order) |
| `paid` | Payment successful — only after verify/webhook persistence |
| `failed` | Retry payment |

Checkout success in the browser is not enough. The page refreshes after `/api/payments/verify`.

## Future refunds

The payment record already has `refunded` as a terminal status after `paid`. A later milestone can add:

- Provider refund ids on the same Payment row (or a child refund ledger)
- Partial refunds as integer minor units that never exceed `amount`
- Vendor/admin-only refund APIs
- Booking `paymentStatus = refunded` without inventing new booking lifecycle states

Do not expose refund endpoints until that work is requested.

## Earnings

Vendor job pages may show payment status. Vendor earnings, commission, and Razorpay Route/transfers are out of scope.
