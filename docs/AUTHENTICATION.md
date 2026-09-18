# Wayfleet authentication

Milestone 4 adds Auth.js (next-auth v5) with email/password credentials and a prepared Google OAuth provider. Email OTP is not implemented.

## Architecture

- **Library:** Auth.js via `next-auth@5` (App Router).
- **Session strategy:** JWT. Credentials cannot use Auth.js database sessions. Role and account status are stored on the token. Passwords are never stored on the token.
- **Runtime split:** `src/auth.config.ts` is Edge-safe and used by `src/middleware.ts`. It does not import Mongoose. `src/auth.ts` runs on Node.js, adds the Credentials provider, and upserts Google users in MongoDB.
- **Passwords:** Node.js `scrypt` with a random salt. Stored as `scrypt$<salt>$<hash>` on `User.passwordHash` (`select: false`).
- **Google OAuth:** Registered only when both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set. New Google users are created as `customer` / `active`. Existing accounts are not demoted.

## Roles

| Role | Registers via UI | Default home |
| --- | --- | --- |
| `customer` | Yes | `/customer` |
| `vendor` | Yes | `/vendor` |
| `admin` | No | `/admin` |

Self-registration as `admin` is rejected. Administrator accounts must be created out of band.

Suspended accounts cannot sign in or use protected resources.

## Protected routes

| Prefix | Role |
| --- | --- |
| `/customer/*` | `customer` |
| `/vendor/*` | `vendor` |
| `/admin/*` | `admin` |

Public pages (`/`, `/login`, `/register`) stay public. Middleware enforces the prefix using the JWT (no MongoDB on the Edge). Server layouts call `requirePageRole()` which re-reads the user from MongoDB when `MONGODB_URI` is set, so a role change or suspension is honored even if the JWT is stale.

`/api/auth/test` is a JSON probe:

- unauthenticated → `401`
- authenticated → `200` with `{ id, role }` only
- `?role=vendor` (or `admin` / `customer`) → `200` or `403`

## Authorization helpers

- `requireAuth()` — session required
- `requireRole("vendor")` — session + exact role
- `requirePageRole("admin", "/admin")` — same, with redirects for pages

UI hiding is not authorization.

## Environment variables

Copy `.env.example` to `.env.local`:

| Name | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | Yes | Signs cookies/JWTs |
| `AUTH_URL` | Recommended | Canonical site URL |
| `AUTH_GOOGLE_ID` | No | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | No | Google OAuth client secret |
| `MONGODB_URI` | Yes for live auth | User lookup and registration |

Never prefix these with `NEXT_PUBLIC_`.

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Testing

Unit tests cover hashing, input validation, role isolation, open-redirect rejection, and the auth test contract. They do not call Google and do not need Atlas. Vitest sets a dummy `AUTH_SECRET` that is not a production value.

## Known limitations

- Email OTP is not implemented.
- Google sign-in cannot be exercised without a real Google Cloud OAuth client.
- JWT role is refreshed from MongoDB on Node handlers when the database is configured; middleware itself only sees the JWT.
- Vendor registration creates a `User` with role `vendor` and a matching `Vendor` profile (`businessName` from the user's name). KYC is still not implemented.
