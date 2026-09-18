# Vehicle marketplace

Milestone 6 replaces the demo catalog with a MongoDB-backed vehicle marketplace. Milestone 9 adds GeoJSON vehicle locations and nearby search. Live trip tracking lives in `docs/REALTIME_TRACKING.md` and does not overwrite listing coordinates. KYC, reviews, and earnings are not included.

## Flow

1. An authenticated **vendor** creates a listing (`POST /api/vehicles`). Ownership is taken from the session, never from a client `vendorId`.
2. The document is stored in the `vehicles` collection with `status: active`.
3. **Customers** and anonymous visitors browse `GET /api/vehicles` (search, filter, sort, pagination) and open `GET /api/vehicles/[id]`.
4. The vendor manages only their own listings via `GET /api/vehicles?mine=1`, `PATCH`, and `DELETE`.

## HTTP API

All JSON bodies use `{ "success": true, "data": ... }` on success. Failures use `{ "success": false, "error": "..." }` and optional `fields` for validation. Stack traces and MongoDB driver errors are never returned.

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/vehicles` | Vendor | Create listing |
| `GET` | `/api/vehicles` | Public | Browse catalog |
| `GET` | `/api/vehicles?mine=1` | Vendor | Manage own fleet |
| `GET` | `/api/vehicles/[id]` | Public | Active listing details |
| `PATCH` | `/api/vehicles/[id]` | Vendor (owner) | Update listing |
| `DELETE` | `/api/vehicles/[id]` | Vendor (owner) | Soft-delete (`status: inactive`) |

### Status codes

| Code | Meaning |
| --- | --- |
| 401 | Unauthenticated |
| 403 | Forbidden (wrong role or not the owner) |
| 400 | Unsupported query, invalid id, or bad sort |
| 404 | Vehicle not found |
| 409 | Duplicate registration number |
| 422 | Validation error |
| 500 | Internal server error |
| 503 | Database unavailable (`MONGODB_URI` missing) |

## Authorization and vendor ownership

```
Authenticated User → requireRole("vendor") → Vendor profile for that user → operation
```

- `requireAuth()` / `requireRole()` from Milestone 4 are unchanged.
- `vendorId`, `vendor`, `user`, `rating`, and document ids in the body are rejected.
- The vendor document is loaded with `ensureVendorForUser` (created on vendor registration, or lazily if an older vendor user has no profile yet).
- `PATCH` / `DELETE` load the vehicle, then `assertOwnsVehicle`. Changing the id in the URL cannot modify another vendor's listing.

## Create body

```json
{
  "category": "car",
  "brand": "Toyota",
  "model": "Etios",
  "registrationNumber": "MH12ZZ9999",
  "priceRupees": 1500,
  "currency": "INR",
  "description": "City sedan",
  "images": [],
  "location": {
    "address": "Pune Airport",
    "city": "Pune",
    "latitude": 18.5793,
    "longitude": 73.9089
  },
  "availability": "available"
}
```

`priceRupees` is whole rupees and is stored as integer paise. `pricing.amount` is also accepted as minor units. Image values, if present, must be `http://` or `https://` URLs. File upload is not implemented.

## Public list query

Only these keys are allowed: `category`, `minPrice`, `maxPrice`, `rating`, `minRating`, `availability`, `search`, `q`, `sort`, `page`, `limit`, `location`, `latitude`, `longitude`, `radius`, `mine`.

Unknown keys, `$` operators, and nested objects are rejected. Values are never passed through to MongoDB as raw operators.

| Param | Notes |
| --- | --- |
| `search` / `q` | Escaped case-insensitive match on brand and model; category tokens match `category` |
| `minPrice` / `maxPrice` | Rupees per day |
| `sort` | `recommended`, `price`, `price_asc`, `price_desc`, `rating`, `createdAt` |
| `page` | 1-based |
| `limit` | Default 12, maximum 50 |

Public lists include **active** vehicles only.

### List response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 0,
    "totalPages": 0
  }
}
```

## Public vehicle payload

Returned fields: id, category, brand, model, description, images, pricing, location (public city/label plus rounded coordinates; `distanceMeters` after a nearby search), availability, denormalized rating, vendor `{ id, businessName, verificationStatus, rating }`, createdAt.

Not returned: registration number, vendor contact, KYC, user ids on the vendor, exact street addresses, passwords, or other internal fields. Exact coordinates and registration numbers are visible only on `?mine=1` and vendor write responses. See `docs/MAPS_AND_GEOSPATIAL.md`.

## Soft delete

`DELETE` sets `status` to `inactive`. The document is kept so a future booking can still reference the vehicle id. Inactive listings are omitted from the public catalog. Reactivation is allowed by `PATCH` with `"status": "active"` from the owning vendor. `blocked` cannot be set by vendors.

## Indexes

| Index | Why |
| --- | --- |
| unique `registrationNumber` | One legal plate per listing |
| `{ vendor: 1 }` | Owner queries |
| `{ category, status, availability }` | Catalog filters |
| `{ location.city, status }` | City prefix filter |
| `{ brand, model, status }` | Search |
| `{ pricing.amount, status }` | Price sort/filter |
| `{ rating.average, status }` | Rating sort/filter |
| `2dsphere` on `location.point` | Nearby search |

Search uses escaped regex with a 40-character cap. Atlas Search is not used yet.

## UI

- `/vehicles` and `/vehicles/[id]` read the same server services as the REST API (no HTTP loopback).
- `/vendor/vehicles` calls the REST API with the session cookie for create/update/inactivate.
- Filtering happens on the server. The in-memory helper in `src/features/vehicles/filter-vehicles.ts` remains for tests.

## Performance

List endpoints run `countDocuments` plus one `find` with `populate("vendor")` (two queries, no N+1). Pagination is mandatory. Public pages do not load the full collection into the client for filtering.
