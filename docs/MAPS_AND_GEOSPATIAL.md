# Maps and geospatial foundation

Milestone 9 adds Google Maps selection and GeoJSON storage. Live GPS streaming is documented in `docs/REALTIME_TRACKING.md`. Directions/Routes and ETA are not included.

## Architecture

```
Browser (Places Autocomplete / map / one-shot geolocation)
  → LocationInput { address, city, state, country, latitude, longitude }
  → API (allowlisted, validated)
  → StoredLocation { label, city, state, country, lat, lng, point }
  → MongoDB GeoJSON Point + 2dsphere
```

Map components live in `src/components/maps/`. They do not import Mongoose. Database rules live in `src/lib/geo/` and the vehicle/booking services.

The browser package is `@vis.gl/react-google-maps` (official vis.gl React wrapper for the Google Maps JavaScript API). It is loaded only on pages that render a picker or a vehicle map.

## API keys

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser | Maps JavaScript API + Places Autocomplete |
| `GOOGLE_MAPS_API_KEY` | Server | Reserved for future Geocoding/Directions. Unused in this milestone. |

Restrict the public key by HTTP referrer in Google Cloud. Never put a private Google secret on `NEXT_PUBLIC_*`. Never commit real keys. Automated tests do not call Google.

## Location object

Client/server write shape (`LocationInput`):

```json
{
  "address": "Pune Airport",
  "city": "Pune",
  "state": "Maharashtra",
  "country": "India",
  "latitude": 18.5793,
  "longitude": 73.9089
}
```

String-only locations are rejected on create/update. Address text is never trusted as a substitute for coordinates.

## GeoJSON

Persisted `location.point` is a GeoJSON Point:

```json
{ "type": "Point", "coordinates": [73.9089, 18.5793] }
```

Order is **`[longitude, latitude]`**, not `[latitude, longitude]`.

If the client sends both labeled lat/lng and a `point`, a reversed pair is rejected. When only unlabeled coordinates are sent, some reversals cannot be detected (both values may be valid latitudes).

Existing vehicle and booking documents that have `{ label, city }` without a point remain valid. Nearby search only matches documents that have `location.point`.

## 2dsphere

`vehicles` has `{ "location.point": "2dsphere" }`. Booking pickup/destination store the same GeoJSON shape for later use but are not indexed for `$near` in this milestone.

## Nearby search

`GET /api/vehicles?latitude=18.52&longitude=73.85&radius=10000`

- `latitude` / `longitude` are required together
- `radius` is meters, integer, 100–100000 (default 10000)
- Query keys are allowlisted; `$` operators are rejected
- MongoDB `$geoNear` on `location.point` supplies `distanceMeters`
- Existing filters (category, price, rating, availability, city `location`, search) still apply
- Nearby results include `location.distanceMeters`
- Distance is **spherical / straight-line**, not driving distance. Google Directions belongs to a later milestone.

Unit tests assert query construction and validation. They do **not** execute `$geoNear` against a live MongoDB. Live geospatial query behavior was not integration-tested in this environment.

## Privacy

Public catalog and `/vehicles/[id]` expose a **generalized** operating area:

- Prefer `city` as the public label (not a private street)
- Coordinates rounded to 2 decimal degrees (~1.1 km)

Vendor `?mine=1` responses include the exact address and coordinates so operators can edit their listing.

Booking pickup and destination stay exact for the customer and vendor on that booking. They are trip endpoints the customer chose, not a vendor home address.

## Geolocation API

“Use my current location” calls `navigator.geolocation.getCurrentPosition` **once**. It is not background tracking and is not used for vehicle GPS. Denied, unavailable, timeout, and unsupported browsers show an error. Users can always search or type coordinates.

## Accessibility

- Search inputs are labeled
- Place suggestions are a listbox
- Errors use `role="alert"`
- Maps are not required: address search (when configured), one-shot geolocation, and manual latitude/longitude are available
- Missing API key shows a status message instead of a blank map

## Live tracking

Milestone 10 streams trip GPS through Socket.IO into `trip_positions`. It does **not** write live coordinates to `Vehicle.location.point`. See `docs/REALTIME_TRACKING.md`.
