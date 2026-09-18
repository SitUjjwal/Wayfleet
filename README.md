# Wayfleet

Wayfleet is a fleet marketplace. Customers book vehicles, vendors operate fleets, and administrators govern the platform.

This repository is at **Milestone 10**: authenticated Socket.IO trip tracking with a separate `trip_positions` collection. Google Directions, ETA, vendor earnings, and ZEGOCLOUD are not implemented.

## Tech stack

- Next.js (App Router)
- React
- TypeScript (strict)
- Tailwind CSS
- Framer Motion (restrained motion)
- ESLint
- MongoDB Atlas with Mongoose
- Auth.js (`next-auth` v5)
- Razorpay Node SDK (`razorpay` 2.9.x)
- Google Maps (`@vis.gl/react-google-maps`)
- Socket.IO (`socket.io` + `socket.io-client`) on a **separate** realtime process

## Requirements

- Node.js 20 or later
- npm
- `.env.local` with `MONGODB_URI` and `AUTH_SECRET` for live sign-in, vehicle, and booking APIs
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` for live checkout (server-only; never `NEXT_PUBLIC_RAZORPAY_KEY_SECRET`)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for Maps JavaScript + Places (restrict by HTTP referrer)
- `NEXT_PUBLIC_REALTIME_URL` for the browser Socket.IO client (local default `http://localhost:4001`)
- `REALTIME_SERVER_SECRET` or `AUTH_SECRET` for realtime token HMAC (server-only)

## Install

```bash
npm install
```

Copy `.env.example` to `.env.local` and set server secrets. Do not commit `.env.local`.

## Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Live tracking also needs the long-lived Socket.IO process:

```bash
npm run realtime
```

Health: [http://localhost:4001/health](http://localhost:4001/health). Standard Vercel serverless handlers cannot host this process. See `docs/REALTIME_TRACKING.md`.

## Typecheck

```bash
npm run typecheck
```

## Lint

```bash
npm run lint
```

## Run tests

```bash
npm test
```

## Production build

```bash
npm run build
npm start
```

## Project layout

- `/vehicles` — public marketplace
- `/vehicles/[id]` — vehicle details and booking form
- `/api/vehicles` — vehicle catalog and vendor writes
- `/api/bookings` — booking create and list
- `/api/bookings/[id]` — booking detail and status actions
- `/api/payments/create-order` — Razorpay order for a booking the customer owns
- `/api/payments/verify` — server-side signature verification
- `/api/payments/webhook` — verified Razorpay events
- `/api/tracking/[bookingId]` — latest trip position for a booking party
- `/api/realtime/token` — short-lived Socket.IO handshake token
- `/customer/bookings` — customer trip list and Pay Now
- `/customer/bookings/[id]/tracking` — customer live map (read-only)
- `/vendor/bookings` — vendor job list with payment status
- `/vendor/bookings/[id]/tracking` — vendor GPS sharing

See `docs/AUTHENTICATION.md`, `docs/DATABASE_DESIGN.md`, `docs/VEHICLE_MARKETPLACE.md`, `docs/BOOKING_SYSTEM.md`, `docs/PAYMENTS.md`, `docs/MAPS_AND_GEOSPATIAL.md`, `docs/REALTIME_TRACKING.md`, and `AI_DEVELOPMENT_RULES.md`.

## Production deploy

- **GitHub:** source of truth. Never commit `.env.local`.
- **Vercel:** Next.js app (`npm run build` / `npm start` is handled by Vercel). Set `AUTH_URL` to the Vercel URL.
- **Render:** Socket.IO process from `render.yaml` (`npm run realtime`). Set `AUTH_URL` / `REALTIME_CORS_ORIGIN` to the Vercel origin, then set `NEXT_PUBLIC_REALTIME_URL` on Vercel to the Render HTTPS URL.

Google OAuth redirect URI in Google Cloud must be:

`https://YOUR-VERCEL-DOMAIN/api/auth/callback/google`

## What is not included yet

- Vendor earnings, payouts, and refunds
- Vendor KYC
- Email OTP
- Google Directions / road distance / ETA
- ZEGOCLOUD
- Reviews
- Image file uploads (http(s) URLs only)
