# REST API Specification

**Product:** Smart Vehicle Recommendation System  
**Status:** Draft for review  
**Base path:** `/api/v1`  
**Source documents:** `01_PRD.md` through `04_DATABASE_DESIGN.md`  
**Version:** 1.0

## 1. API conventions

- Public requests and responses use JSON over HTTPS.
- An ingress/router forwards each route to its owning service. It must
  not implement domain authorization or modify business data.
- The three services own separate APIs and databases:
  - **Identity and User Service:** `/auth/*`, `/users/*`
  - **Vehicle Catalog Service:** `/vehicles/*`, `/admin/vehicles/*`
  - **Recommendation Service:** `/recommendations/*`, `/compare`,
    `/favorites/*`, optional `/longevity/*`
- Vehicle and user IDs are strings representing opaque IDs from their
  owning service.
- Pagination uses `page` (1-based) and `limit`. Proposed defaults:
  `page=1`, `limit=20`, maximum `limit=100`. These limits must be
  confirmed against the deployment and dataset.
- Unless noted, requests reject unknown fields rather than silently
  trusting them.
- The backend that owns a resource is authoritative. The client cannot
  set roles, ownership, scores, or other protected fields.
- Authentication uses the selected secure HttpOnly SameSite cookie.
  Examples below describe routes in terms of an authenticated
  credential; cookie flags, CSRF handling, and token lifecycle are
  service implementation requirements.

## 2. Common response and error shapes

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "fieldErrors": [
      {
        "field": "budget.max",
        "code": "MUST_BE_AT_LEAST_MIN",
        "message": "Maximum budget must be greater than or equal to minimum budget."
      }
    ],
    "correlationId": "request-correlation-id"
  }
}
```

`fieldErrors` and `correlationId` may be omitted when not applicable.
Messages must not expose stack traces, database details, credentials, or
internal service URLs.

### Health endpoints

Each service exposes `GET /health`, `GET /health/live`, and
`GET /health/ready`. `/health` and `/health/live` return `200` with
`{"service":"<service-name>","status":"ok"}` when the process is
running. `/health/ready` returns the same response only after its owned
MongoDB connection and required indexes are available; otherwise it
returns `503` with the common error envelope and code
`SERVICE_NOT_READY`. Readiness does not claim downstream services are
available.

Every response includes an `X-Correlation-ID` header. A valid incoming
`X-Correlation-ID` containing 1–128 ASCII letters, digits, dots,
underscores, or hyphens is preserved; otherwise the service generates
an opaque UUID. Error envelopes include that same ID.

Requests with a body must use `application/json`; bodies are limited to
64 KiB and must contain a JSON object or array. Unsupported content
types return `415`, malformed JSON returns `400`, and oversized bodies
return `413`, using the common error envelope.

### Paginated collection

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

The exact total-count behavior can be revised if counting becomes
expensive; any alternative must remain documented and testable.

## 3. Identity and User Service endpoints

### 3.1 Register

- **Method/path:** `POST /api/v1/auth/register`
- **Purpose:** Create a regular user account.
- **Authentication:** None.
- **Authorization:** Public endpoint with rate limiting.
- **Request body:**

```json
{
  "email": "buyer@example.test",
  "password": "user-provided-password",
  "displayName": "Sample Buyer"
}
```

- **Validation:** Valid email; normalized case-insensitively; password
  meets the approved password policy; display name optional and bounded.
  `role`, `_id`, and `passwordHash` are forbidden.
- **Success:** `201 Created`

```json
{
  "user": {
    "id": "opaque-user-id",
    "email": "buyer@example.test",
    "role": "user",
    "profile": {
      "displayName": "Sample Buyer"
    }
  }
}
```

- **Errors:** `400` validation, `409` duplicate email, `429` rate limit,
  `500` unexpected failure.
- **Related requirements:** FR-AUTH-01, NFR-SEC-01.

### 3.2 Login

- **Method/path:** `POST /api/v1/auth/login`
- **Purpose:** Verify credentials and establish the approved
  JWT-backed session.
- **Authentication:** None; rate limited.
- **Authorization:** Public.
- **Request body:** `{ "email": "...", "password": "..." }`
- **Validation:** Both fields required; normalize email; bounded body.
- **Success:** `200 OK`, safe user projection and credential/session
  established using the configured HttpOnly cookie; never include the
  cookie value in JSON.
- **Errors:** `400` validation, `401` generic invalid credentials,
  `429` rate limit, `500` unexpected failure.
- **Security:** Same generic credential error for unknown email and
  wrong password. Never return the password or hash.
- **Related requirements:** FR-AUTH-02, NFR-SEC-02.

### 3.3 Logout

- **Method/path:** `POST /api/v1/auth/logout`
- **Purpose:** Invalidate/clear the current session according to the
  selected JWT session policy.
- **Authentication:** Authenticated credential required.
- **Authorization:** Current account only.
- **Request body:** Empty unless the selected token-revocation design
  requires a specific session identifier.
- **Success:** `204 No Content` or a documented empty success response.
- **Errors:** `401` invalid credential, `500` unexpected failure.
- **Related requirements:** FR-AUTH-03, NFR-SEC-02.

### 3.4 Current identity

- **Method/path:** `GET /api/v1/auth/me`
- **Purpose:** Return the authenticated user's safe identity projection.
- **Authentication:** Authenticated credential required.
- **Authorization:** Current identity only.
- **Request:** No body.
- **Success:** `200 OK` with `id`, `email`, `role`, and approved profile
  fields.
- **Errors:** `401` missing/invalid/expired credential, `500` failure.
- **Related requirements:** FR-AUTH-04.

### 3.5 Read own profile

- **Method/path:** `GET /api/v1/users/me`
- **Authentication:** Authenticated credential required.
- **Authorization:** Own profile only.
- **Success:** `200 OK` with safe profile fields, excluding
  `passwordHash` and signing/session material.
- **Errors:** `401`, `404` if account is deleted/disabled according to
  approved lifecycle, `500`.
- **Related requirements:** FR-USER-01.

### 3.6 Update own profile

- **Method/path:** `PATCH /api/v1/users/me`
- **Authentication:** Authenticated credential required.
- **Authorization:** Own profile only.
- **Request body:** Allowlisted editable fields such as
  `{ "displayName": "Sample Buyer", "city": "Example City" }`.
- **Validation:** Reject protected or unknown fields, including
  `role`, `_id`, `email` (unless verified email-change flow is later
  approved), and `passwordHash`.
- **Success:** `200 OK` with updated safe profile projection.
- **Errors:** `400` validation, `401`, `500`.
- **Related requirements:** FR-USER-01, NFR-SEC-04.

### 3.7 Read own preferences

- **Method/path:** `GET /api/v1/users/me/preferences`
- **Authentication:** Authenticated credential required.
- **Authorization:** Own preferences only.
- **Success:** `200 OK`, validated saved preferences or an empty object.
- **Errors:** `401`, `500`.
- **Related requirements:** FR-USER-02.

### 3.8 Replace/update own preferences

- **Method/path:** `PUT /api/v1/users/me/preferences`
- **Authentication:** Authenticated credential required.
- **Authorization:** Own preferences only.
- **Request body:** Approved preference schema, including optional
  budget, vehicle/fuel/transmission preferences, seats, environment,
  annual distance, and priority values.
- **Validation:** Same constraints as recommendation inputs; reject
  unknown fields; `budget.min <= budget.max`; no implicit defaults for
  omitted values.
- **Success:** `200 OK` with stored preferences.
- **Errors:** `400` validation, `401`, `500`.
- **Related requirements:** FR-USER-02, FR-REC-01.

## 4. Vehicle Catalog Service endpoints

### 4.1 List/search/filter vehicles

- **Method/path:** `GET /api/v1/vehicles`
- **Purpose:** Browse published vehicles.
- **Authentication:** Public; optional authenticated context does not
  expand catalog access.
- **Authorization:** Published records only.
- **Query parameters:**
  - `page`, `limit`
  - `q` (search text; searchable fields to be approved)
  - `make`, `bodyType`, `fuelType`, `transmission`, `seatingCapacity`
  - `minPrice`, `maxPrice`, required companion `priceType`
  - `sortBy`, `sortOrder`
- **Validation:** Allowlisted enums and sort fields; finite nonnegative
  price values; compatible `priceType` (`ex_showroom`, `on_road`,
  `used`); min not greater than max; bounded `q`; `limit <= 100`
  (proposed).
- **Filter semantics:** Different filter dimensions combine with AND.
  Multi-value semantics, if supported, are OR within one dimension.
  Vehicles missing a requested filter value do not match.
  Price filtering applies only to the requested price type and INR.
- **Success:** `200 OK` paginated published records. No matches returns
  `items: []`, not an error.
- **Errors:** `400` invalid query, `429` rate limit, `500` failure.
- **Related requirements:** FR-CAT-01, FR-SEARCH-01, FR-SEARCH-02.

### 4.2 Vehicle details

- **Method/path:** `GET /api/v1/vehicles/:vehicleId`
- **Authentication:** Public.
- **Authorization:** Published record only.
- **Validation:** Validate identifier syntax before querying.
- **Success:** `200 OK` with approved vehicle fields, price types,
  available provenance, verification timestamps, and explicit
  unavailable/missing states.
- **Errors:** `400` malformed ID, `404` missing or unpublished record,
  `500` failure.
- **Related requirements:** FR-CAT-02.

### 4.3 Admin vehicle list

- **Method/path:** `GET /api/v1/admin/vehicles`
- **Authentication:** Authenticated credential required.
- **Authorization:** Administrator role verified server-side.
- **Query parameters:** `page`, `limit`, optional `status`, `make`, and
  supported sort.
- **Success:** `200 OK` paginated records including publication and
  data-quality metadata needed for maintenance.
- **Errors:** `400`, `401`, `403`, `429`, `500`.
- **Related requirements:** FR-ADMIN-03, NFR-SEC-05.

### 4.4 Create vehicle

- **Method/path:** `POST /api/v1/admin/vehicles`
- **Authentication:** Authenticated credential required.
- **Authorization:** Administrator only.
- **Request body:** Allowlisted vehicle catalog fields; create state
  defaults to `draft`. Client cannot set admin actor identity; service
  derives it from the verified credential.
- **Validation:** Required make/model; supported enums and units;
  valid distinct price objects; provenance validation; unknown/protected
  fields rejected.
- **Success:** `201 Created` with the created safe vehicle record.
- **Errors:** `400` validation, `401`, `403`, `409` conflict if a
  documented uniqueness rule applies, `500`.
- **Related requirements:** FR-ADMIN-01, FR-CAT-03.

### 4.5 Update vehicle

- **Method/path:** `PATCH /api/v1/admin/vehicles/:vehicleId`
- **Authentication:** Authenticated credential required.
- **Authorization:** Administrator only.
- **Request body:** Partial allowlisted fields; protected fields and
  actor identifiers are rejected.
- **Validation:** Identifier syntax and field rules; update is atomic.
- **Success:** `200 OK` updated record.
- **Errors:** `400`, `401`, `403`, `404`, `409`, `500`.
- **Related requirements:** FR-ADMIN-02, FR-CAT-03.

### 4.6 Publish or unpublish a vehicle

- **Method/path:** `PATCH /api/v1/admin/vehicles/:vehicleId/status`
- **Authentication:** Authenticated credential required.
- **Authorization:** Administrator only.
- **Request body:** `{ "status": "published" }` or
  `{ "status": "unpublished" }`.
- **Validation:** Only permitted state transitions; required
  catalog/provenance checks before publication.
- **Success:** `200 OK` with updated status.
- **Errors:** `400`, `401`, `403`, `404`, `409` if publication
  preconditions are not met, `500`.
- **Related requirements:** FR-ADMIN-01, FR-ADMIN-02.

### 4.7 Delete vehicle

- **Method/path:** `DELETE /api/v1/admin/vehicles/:vehicleId`
- **Authentication:** Authenticated credential required.
- **Authorization:** Administrator only.
- **Behavior:** Prefer unpublish/soft-delete when needed to preserve
  provenance or references; exact retention policy must be approved.
- **Success:** `204 No Content` after documented deletion/unpublish
  behavior.
- **Errors:** `400`, `401`, `403`, `404`, `409` if deletion is blocked
  by policy, `500`.
- **Related requirements:** FR-ADMIN-02.

## 5. Recommendation Service endpoints

### 5.1 Generate recommendations

- **Method/path:** `POST /api/v1/recommendations`
- **Purpose:** Filter eligible vehicles and calculate ranked,
  explainable matches.
- **Authentication:** Required. Unauthenticated callers receive `401 UNAUTHORIZED`.
- **Authorization:** User identity is verified via session cookie or bearer token; user ID is never supplied as an authoritative body field.
- **Request body:**

```json
{
  "preferences": {
    "budget": {
      "min": 500000,
      "max": 1000000,
      "currency": "INR",
      "priceType": "ex_showroom"
    },
    "vehicleTypes": ["body-type-enum"],
    "fuelTypes": ["fuel-type-enum"],
    "transmissions": ["transmission-enum"],
    "minimumSeats": 5,
    "drivingEnvironment": "mixed",
    "annualDistanceKm": 12000,
    "priorities": {
      "reliability": 4,
      "maintenanceCost": 3,
      "fuelEfficiency": 5,
      "safety": 4,
      "performance": 2
    }
  },
  "useSavedPreferences": false,
  "page": 1,
  "limit": 20
}
```

Values are schema examples only, not scoring recommendations or real
vehicle data. Exactly one of `preferences` and
`useSavedPreferences: true` must be provided; the second option
requires an authenticated user and a protected Identity Service read.

- **Validation:** Validate budget bounds and currency/price type,
  allowlisted enums, seat count, finite annual distance, and approved
  priority scale. Priorities are not weights from the browser; the
  service maps them using approved server configuration. Missing
  optional fields remain missing.
- **Processing:** Recommendation Service requests candidates from the
  Catalog Service with a private service credential. It applies
  mandatory eligibility filters, ranks using a deterministic
  versioned rule, and returns score explanations. It must not relax
  mandatory constraints silently.
- **Success:** `200 OK`

```json
{
  "ruleVersion": "rules-v1",
  "items": [
    {
      "vehicle": {
        "id": "opaque-vehicle-id",
        "make": "Catalog value",
        "model": "Catalog value"
      },
      "rank": 1,
      "matchScore": 0,
      "componentScores": {},
      "reasons": [],
      "tradeoffs": [],
      "constraints": [],
      "missingData": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 0
  },
  "scoreDisclaimer": "Match score reflects the submitted preferences; it is not a probability or guarantee."
}
```

`matchScore: 0` above is a schema placeholder only. Production responses
contain only values calculated by the service; no vehicle or score
fixture is implied.

- **Empty result:** `200 OK` with empty `items` and a safe explanation;
  do not relax hard filters.
- **Errors:** `400` invalid/missing required input, `401` required
  saved preferences without valid authentication, `429` rate limit,
  `502` invalid Catalog Service response, `503` Catalog Service
  unavailable, `500` unexpected failure.
- **Related requirements:** FR-REC-01 through FR-REC-04,
  FR-CAT-01, NFR-REC-01.

### 5.2 Compare vehicles

- **Method/path:** `POST /api/v1/compare`
- **Purpose:** Return comparable fields for selected vehicles.
- **Authentication:** Required. Unauthenticated callers receive `401 UNAUTHORIZED`.
- **Authorization:** Authenticated user only; published vehicles only.
- **Request body:**

```json
{
  "vehicleIds": ["opaque-vehicle-id-a", "opaque-vehicle-id-b"]
}
```

- **Validation:** At least two distinct valid IDs. Proposed cap is four
  vehicles per comparison and requires approval. Invalid IDs are
  rejected; unpublished/nonexistent records are not exposed.
- **Processing:** Recommendation Service requests details from the
  Catalog Service API and formats a stable set of comparable fields.
- **Success:** `200 OK` with selected vehicle records and
  specification rows. Missing values are explicit and consistent.
- **Errors:** `400` malformed IDs, duplicates if not normalized,
  count outside approved bounds, `404` unavailable vehicle,
  `502` invalid downstream response, `503` Catalog Service unavailable,
  `500`.
- **Related requirements:** FR-COMP-01.

### 5.3 List favorites

- **Method/path:** `GET /api/v1/favorites`
- **Authentication:** Authenticated credential required.
- **Authorization:** Current user only; `userId` comes from verified
  identity.
- **Query parameters:** `page`, `limit`, optional stable sort.
- **Processing:** Read owned favorite IDs from local database; resolve
  current public details through Catalog Service. Handle removed or
  unpublished records as unavailable without exposing hidden catalog
  data.
- **Success:** `200 OK` paginated list.
- **Errors:** `401`, `502` invalid downstream response, `503` Catalog
  Service unavailable, `500`.
- **Related requirements:** FR-FAV-01.

### 5.4 Add favorite

- **Method/path:** `PUT /api/v1/favorites/:vehicleId`
- **Authentication:** Authenticated credential required.
- **Authorization:** Current user only.
- **Request body:** Empty.
- **Validation:** Valid ID; verify vehicle is currently published using
  Catalog Service; enforce unique `(userId, vehicleId)`.
- **Success:** `201 Created` for a new favorite; `200 OK` or `204 No
  Content` for an already-existing favorite. Select one idempotent
  behavior and apply consistently.
- **Errors:** `400` malformed ID, `401`, `404` vehicle unavailable,
  `502`, `503`, `500`.
- **Related requirements:** FR-FAV-01, NFR-SEC-04.

### 5.5 Remove favorite

- **Method/path:** `DELETE /api/v1/favorites/:vehicleId`
- **Authentication:** Authenticated credential required.
- **Authorization:** Current user only.
- **Success:** `204 No Content`; repeated removal should use the same
  idempotent result.
- **Errors:** `400` malformed ID, `401`, `500`.
- **Related requirements:** FR-FAV-02.

### 5.6 Longevity estimate (optional, disabled by default)

- **Method/path:** `POST /api/v1/longevity/estimate`
- **Authentication:** Per approved privacy/rate-limit policy; must be
  defined before enabling.
- **Authorization:** User can submit only their own inputs. No client
  supplied score is accepted.
- **Request body:** The exact schema depends on an approved target,
  available evidence, and `08_AI_ML_DESIGN.md`. Do not accept unsupported
  inputs as though they were measured data.
- **Success when enabled:** `200 OK` with target definition, estimate,
  uncertainty supported by model evaluation, model version, input-data
  limitations, and a clear experimental disclaimer.
- **When not enabled:** `503 Service Unavailable` with
  `FEATURE_NOT_ENABLED`; do not fabricate an estimate. If a separate
  heuristic is approved, return a distinct response explicitly labeled
  non-predictive.
- **Errors:** `400` invalid request, `401` if authentication is required,
  `429` rate limit, `502` malformed ML response, `503` feature/service
  unavailable, `500`.
- **Related requirements:** FR-LONG-01, FR-LONG-02, NFR-ML-01.

### 5.7 AI multimodal vehicle identification

- **Method/path:** `POST /api/v1/ai/identify-vehicle`
- **Purpose:** Analyze vehicle imagery using Gemini multimodal vision and match against published catalog candidates.
- **Authentication:** Required. Unauthenticated callers receive `401 UNAUTHORIZED`.
- **Authorization:** Authenticated user only.
- **Request body:**
  - `image`: Base64 JPEG/PNG data URL or encoded string (max 4MB).
  - `mimeType`: Image MIME type (e.g., `image/jpeg`).
  - `apiKey`: Optional user-supplied Google AI Studio Gemini API key to override server quota.
- **Processing:** Validates image format and size; calls Google Gemini Vision API; sanitizes and structure-validates identified attributes; queries published catalog candidates for matching records.
- **Success:** `200 OK` with structured vehicle details, confidence scores, detected features, and matching catalog vehicles.
- **Errors:** `400` invalid image or missing image payload, `401` unauthenticated, `429` rate limit, `502` Gemini upstream error, `500` server failure.

## 6. Private service-to-service APIs

These routes are not available from the public browser path and must be
reachable only through private networking plus service authentication.
They still validate input and caller identity.

### 6.1 Catalog candidate search

- **Owning service:** Vehicle Catalog Service
- **Method/path:** `POST /internal/v1/vehicles/search`
- **Caller:** Recommendation Service only.
- **Purpose:** Return published candidate records matching validated
  allowlisted filters for recommendation and comparison.
- **Request:** Normalized filter object plus bounded page/limit or
  cursor.
- **Response:** Published vehicle IDs and only fields needed for
  eligibility, ranking, display, provenance warnings, and pagination.
- **Errors:** `400`, `401`/`403` invalid service identity,
  `429`, `500`.
- **Rules:** No arbitrary MongoDB query syntax; no unpublished catalog
  records; pagination must bound candidate retrieval.

### 6.2 Catalog vehicle lookup

- **Owning service:** Vehicle Catalog Service
- **Method/path:** `POST /internal/v1/vehicles/lookup`
- **Caller:** Recommendation Service only.
- **Request:** Bounded array of distinct opaque vehicle IDs.
- **Response:** Current published vehicle details for those IDs and
  unavailable status for missing/unpublished IDs without leaking their
  private details.
- **Errors:** `400`, `401`/`403`, `429`, `500`.

### 6.3 Preference retrieval (optional contract)

- **Owning service:** Identity and User Service
- **Method/path:** `GET /internal/v1/users/:userId/preferences`
- **Caller:** Recommendation Service, authenticated as a service and
  acting on a verified user request.
- **Request:** User ID from verified token subject; recommendation
  service must not accept arbitrary user IDs from browser input.
- **Response:** Only the user's stored preference object.
- **Errors:** `401`/`403`, `404`, `429`, `500`.

This call is required only if recommendation requests support
`useSavedPreferences: true`; do not expose this internal route through
public ingress.

## 7. Cross-cutting security and operational rules

- Each public service validates the identity token against approved
  issuer, audience, expiry, signature, and key-rotation rules.
- Ingress routing does not replace service-level authorization.
- Admin routes enforce role checks in the Catalog Service.
- User-owned endpoints enforce ownership in the owning service.
- Internal requests use a service identity and cannot be invoked by
  browser credentials alone.
- All routes validate content type, body size, IDs, enums, numeric
  bounds, and query allowlists.
- Rate limit registration/login and expensive recommendation/longevity
  operations. Exact thresholds depend on host and abuse assumptions.
- Timeouts and retry limits apply to inter-service calls. Retry only
  idempotent operations or requests carrying an approved idempotency
  key.
- Propagate correlation IDs; never log tokens, passwords, secrets, or
  raw sensitive request bodies.
- Return consistent safe errors; never expose stack traces or raw
  database/service internals.

## 8. API decisions requiring approval

1. Token expiry, refresh/revocation, CSRF mechanism, and logout
   semantics across services (cookie transport is selected).
2. Ingress product, public route mapping, and CORS/origin policy.
3. Exact recommendation request rules for strict/optional preferences,
   priority scale, default weights, and missing-data treatment.
4. Whether saved preferences are retrieved by the Recommendation
   Service or submitted only by the client.
5. Proposed pagination maximum and comparison cap (four is a proposed
   value only).
6. Whether favorites are idempotent on duplicate add and on repeated
   delete (recommended: yes).
7. Catalog search vocabulary, supported sort fields, and search
   semantics.
8. Admin delete versus unpublish policy.
9. Service-to-service authentication, credential rotation, timeout, and
   retry settings.
10. Whether and when the optional longevity endpoint is enabled.

## 9. Review gate

This specification makes no claim that endpoints are implemented. Review
and approve the API contracts and listed policy choices before
implementing the service milestones.
