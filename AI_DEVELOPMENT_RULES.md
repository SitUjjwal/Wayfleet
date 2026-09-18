# Wayfleet AI Development Rules

These rules are the permanent engineering guidelines for this repository. Follow them on every milestone.

## Milestone discipline

1. Implement only the requested milestone. Do not start the next milestone automatically.
2. Do not implement unrequested product features.
3. Do not add fake or placeholder business functionality (mock bookings, fake GPS, dummy wallets, fake inboxes).
4. Do not wire external integrations until that milestone explicitly asks for them. Reserved integrations include Auth.js, Google OAuth, email OTP, Razorpay, Google Maps, Socket.IO, and ZEGOCLOUD.

## Stack and architecture

5. The application is a Next.js App Router app with TypeScript `strict` mode, Tailwind CSS, and ESLint.
6. Application code lives under `src/`. Route groups stay split by audience: `(auth)`, `(customer)`, `(vendor)`, `(admin)`.
7. Keep HTTP handlers and Server Actions thin. Domain rules belong in server modules, not in UI components.
8. Database access is server-only. Client components must never import Mongoose, models, or `MONGODB_URI`.
9. Do not query MongoDB from `middleware` or the Edge runtime.

## Data and money

10. MongoDB Atlas is the database. Mongoose is the ODM. Do not add extra database libraries unless a milestone requires them.
11. Store money as integer minor units plus an ISO currency code. Do not use floating-point currency.
12. Prefer references (`ObjectId`) over embedding for User, Vendor, Vehicle, Booking, Payment, and Review.
13. Validate every write with Mongoose schema rules. Reject invalid ObjectIds instead of letting MongoDB throw opaque errors.

## Security

14. Never commit secrets. Real values belong in `.env.local`, which is gitignored. Committed examples use `.env.example` with empty values only.
15. `MONGODB_URI` is a server environment variable. Never prefix it with `NEXT_PUBLIC_`.
16. API error responses must not include connection strings, credentials, or raw driver errors.
17. Authorization must be enforced on the server. Hiding UI is not access control.
18. Log redacted database errors only. Never log the raw MongoDB URI.

## Quality gates

19. Do not install packages that are not required for the current milestone.
20. Do not skip failing tests. If a check fails, fix the root cause and re-run the full validation set.
21. Before declaring a milestone complete, run:

    - `npm run typecheck`
    - `npm run lint`
    - `npm test`
    - `npm run build`

22. Unit tests must not require production Atlas credentials. Integration tests that need MongoDB must use a dedicated test URI or an in-memory strategy, never a production cluster.

## Product roles

23. Primary roles are `customer`, `vendor`, and `admin`.
24. Customers see only their own bookings and reviews. Vendors see only their own fleet and jobs. Admins are audited in later milestones.

## Documentation

25. Keep `README.md` accurate for the current milestone.
26. Database shape and indexes live in `docs/DATABASE_DESIGN.md`. Update that document when schemas change.
