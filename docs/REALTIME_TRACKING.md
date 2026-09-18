# Real-time trip tracking

Milestone 10 adds authenticated Socket.IO tracking for a booking. Google Directions, ETA, notifications, and live overwrites of `Vehicle.location.point` are out of scope.

## Architecture

```
Vendor browser (watchPosition while sharing is on)
  → Socket.IO tracking:location
    → authenticated realtime process
      → booking authorization
      → latest-position upsert on trip_positions
      → room tracking:booking:<bookingId>
        → customer tracking:position
```

The Next.js app remains the HTTP API and session issuer. The Socket.IO process is a **separate long-lived Node server** (`realtime/server.ts`, `npm run realtime`).

`Vehicle.location.point` is still the vendor's **base / operating** location from Milestone 9. Live GPS never writes to that field.

## Socket authentication

Browsers do not send `userId` or `role`. They call `GET /api/realtime/token` (Auth.js session required). The handler signs a short-lived HMAC token (`typ: realtime`, 10 minutes) with `REALTIME_SERVER_SECRET` or, if that is empty, `AUTH_SECRET`.

The realtime server verifies the token on handshake. Missing, expired, tampered, or suspended tokens become `TRACKING_UNAUTHORIZED`. Secrets are never `NEXT_PUBLIC_*`.

Reconnects run the handshake again, including a fresh token from `/api/realtime/token`. The client then emits `tracking:join` and the UI refetches `GET /api/tracking/:bookingId`.

## Rooms

Room name: `tracking:booking:<bookingId>`.

There are no public `vehicleId` rooms. Join is authorized per booking.

## Eligibility

Tracking is allowed for **`confirmed` and `in_progress`**.

`confirmed` is included so a vendor can share location on the way to pickup. `pending`, `rejected`, `cancelled`, and `completed` cannot join or publish. The server re-checks status on every publish. When a publish is rejected as inactive, the room receives `tracking:status` with `trackingActive: false` and sockets are removed from the room.

## Authorization

| Actor | Subscribe | Publish |
| --- | --- | --- |
| Customer | Own booking, eligible status | Never |
| Vendor | Own vendor profile owns `booking.vendor`, eligible status | Same |
| Admin | No | No |

`vendorId` and `vehicleId` on a client payload are ignored. The server copies vehicle and vendor from the booking document.

## Position model

Collection `trip_positions`, model `TripPosition`:

- `booking` (unique), `vehicle`, `vendor`
- GeoJSON `point` `{ type: "Point", coordinates: [longitude, latitude] }`
- `latitude`, `longitude`, optional `accuracy` / `heading` / `speed`
- `recordedAt`, `source: geolocation`, `expiresAt`

One document per booking. Each accepted GPS event **upserts** that row. This is not a ping history.

## Retention

`expiresAt` is set to now + 24 hours on every upsert. MongoDB TTL (`expireAfterSeconds: 0` on `expiresAt`) deletes stale rows. Storage growth is bounded by the number of recently tracked bookings, not by GPS frequency.

After a trip is no longer eligible, HTTP and sockets stop exposing coordinates even if a TTL row still exists.

## GPS frequency and rate limits

Defaults:

- Client `watchPosition` emit interval: **5 seconds** (`TRACKING_MIN_INTERVAL_MS`, 1000–60000 if set)
- Server rejects faster updates with `TRACKING_RATE_LIMITED`
- Unchanged coordinates (epsilon `0.00001`) skip the database write and the broadcast
- Accuracy 0–5000 m, speed 0–90 m/s, heading 0–360
- `recordedAt` more than 60s in the future or 120s in the past is rejected

The browser must not send multiple updates per second. `watchPosition` runs **only** while the vendor has sharing on. Closing the page or pressing Stop sharing calls `clearWatch`.

## Socket events

| Event | Direction | Purpose |
| --- | --- | --- |
| `tracking:join` | client → server | `{ bookingId }` |
| `tracking:leave` | client → server | `{ bookingId }` |
| `tracking:location` | vendor → server | GPS payload |
| `tracking:position` | server → room | Latest safe position |
| `tracking:status` | server → socket/room | `{ bookingId, bookingStatus, trackingActive }` |
| `tracking:error` | server → socket | `{ code, message }` |

Error codes: `TRACKING_UNAUTHORIZED`, `TRACKING_FORBIDDEN`, `TRACKING_NOT_ACTIVE`, `INVALID_LOCATION`, `STALE_LOCATION`, `TRACKING_RATE_LIMITED`, `TRACKING_INVALID_BOOKING`. No stack traces or Mongo errors.

## HTTP

- `GET /api/realtime/token` — session required, returns `{ token, expiresAt }`
- `GET /api/tracking/[bookingId]` — session required, booking party only. Returns `{ bookingId, bookingStatus, trackingActive, canPublish, position }`

`position` is omitted (null) when tracking is not active.

## Privacy

- Live GPS is only for parties on that booking while tracking is eligible
- Public marketplace maps still use generalized operating-area coordinates
- No historical route polyline is stored or returned
- GPS payloads are not logged
- Customer UI cannot publish

## Reconnect

On socket `connect` (including reconnect): authenticate with a new token, `tracking:join`, refetch latest HTTP position, then receive live `tracking:position` events. Authorization is not cached from the previous connection.

## Deployment / Vercel

There is no `vercel.json` long-lived WebSocket target. **Standard Vercel serverless / Fluid compute request handlers cannot run this Socket.IO server.** Production tracking requires a separate always-on host (Fly, Railway, a VM, etc.) running `npm run realtime`, with:

- `MONGODB_URI`
- `AUTH_SECRET` or `REALTIME_SERVER_SECRET` matching the Next.js app
- `AUTH_URL` / `REALTIME_CORS_ORIGIN` set to the public site origin
- `NEXT_PUBLIC_REALTIME_URL` on the Next.js deployment pointing at that host (HTTPS + WSS)

Local:

```bash
npm run dev
npm run realtime
```

Default realtime URL: `http://localhost:4001`. Health: `GET http://localhost:4001/health`. Transport: WebSocket first, polling fallback. CORS allowlists `AUTH_URL` and `http://localhost:3000`.

This milestone does **not** claim Socket.IO is production-ready on Vercel itself.

## Testing

Unit tests cover token HMAC, payload validation, authorization, HTTP routes, an in-memory Socket.IO server, the Mongoose schema/indexes, and UI markup. They do not need Atlas or a public realtime host.

Live multi-device GPS testing was not performed in this environment. TTL deletion is asserted at schema level (`expiresAt` index), not by waiting on a live mongod.
