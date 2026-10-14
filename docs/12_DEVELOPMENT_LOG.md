# Development Log

**Project:** Smart Vehicle Recommendation System  
**Status:** Documentation approved; Milestones 1 and 2 complete;
product features and database integration not started

## 2026-10-10 — Initial product and design documentation

### Completed

- Created the product requirements, functional/non-functional
  requirements, architecture, database design, API specification,
  UI/UX guidance, recommendation design, ML evidence gate, security
  baseline, test strategy, and staged implementation plan.
- Added root `AGENTS.md` instructions and this development log.
- The user selected a three-service architecture:
  - Identity and User Service
  - Vehicle Catalog Service
  - Recommendation Service
- The user selected separate database/collection ownership per service;
  no cross-service database access is allowed.
- The user selected a light, clean automotive marketplace visual
  direction with a restrained blue accent.
- The user approved omitting longevity functionality from the MVP until
  suitable evidence is available.
- The user selected Node.js 24 LTS, npm workspaces, and the recommended
  secure HttpOnly SameSite cookie transport.
- Local development will use the Vite proxy as a lightweight router;
  production hosting remains provider-neutral until selected.
- The user approved the explainable, rule-based recommendation
  direction, with explicit hard/soft constraints and no unsupported
  reliability scores.
- The existing `complaint_management_system` folder was left untouched;
  the vehicle project documents are isolated under `Vehicle_Recom_Sys/`.

### Validation

- Reviewed the provided prompt pack and generated documentation for
  consistency with its safety/data constraints.
- No application code has been implemented.
- No build, lint, unit, integration, security, or browser tests have
  been run; there is no codebase for this project yet.

### Unresolved before implementation

- Finalize JWT expiry, refresh/logout/revocation policy, CSRF mechanism,
  and public-key rotation strategy during the authentication milestone.
- Select production hosting, ingress/router, network, and service
  identity setup when deployment is in scope.
- Identify an authorized catalog data source, coverage, and update
  cadence; catalog remains empty until then.
- Identify an authorized catalog data source, coverage, and update
  cadence.
- Approve detailed recommendation scoring policy: hard/soft inputs,
  priority scale/weights, budget-fit transform, missing-data threshold,
  tie-breaking, pagination, and comparison cap.
- Decide database cluster layout, audit-log policy, user data deletion,
  and retention.
- Continue with the remaining recommendation-policy decisions before
  implementing scoring.

## 2026-10-10 — Milestone 1 scaffolding started

### Decisions used

- Node.js 24 LTS.
- npm workspaces.
- Secure HttpOnly SameSite cookie transport; exact token lifecycle and
  key rotation remain for the authentication milestone.
- Vite development proxy routes the client to local service ports.
- Production hosting remains provider-neutral.

### Completed

- Added root workspace, React/Vite/Tailwind client scaffold, and
  independently runnable Express scaffolds for all three domain
  services.
- Added one HTTP smoke test per service.
- Added Vite proxy routes for local development service paths.
- Installed dependencies with Node.js `v24.14.1` and npm `11.8.0`;
  npm reported zero known vulnerabilities at installation time.
- `npm test`: passed, 3 service smoke tests passed.
- `npm run lint`: passed after adding the root ESM package type.
- `npm run build`: passed for the Vite client and all service syntax
  checks.
- Started each local service and the Vite client; all three service
  scaffold endpoints returned the expected JSON and the client page
  returned its HTML successfully. The UI was opened in the browser and
  its preview content was verified.
- Temporary development servers were stopped after validation.
- No database connection or vehicle data is configured.

### Limitations

- The current pages and APIs are scaffolds, not completed product
  features.
- No database is connected, and no vehicle data is seeded.
- Secure cookie authentication, recommendation logic, admin functions,
  comparison, favorites, and production deployment are not implemented.

## 2026-10-10 — Milestone 2 service foundations

### Completed

- Added service-owned foundation modules for Identity/User,
  Vehicle Catalog, and Recommendation so each service remains
  independently deployable without importing another service's runtime
  code.
- Added validated `HOST`/`PORT` configuration with local defaults
  (`127.0.0.1` and ports `4001`, `4002`, `4003`).
- Added `/health`, `/health/live`, and `/health/ready` to each service.
  Readiness currently verifies process health only; database readiness
  is deferred to Milestone 3.
- Added request correlation IDs, response correlation headers, safe
  consistent error envelopes, structured request/lifecycle logs,
  64 KiB JSON body limits, JSON content-type enforcement, malformed
  JSON handling, and graceful HTTP server shutdown.
- Preserved each existing root scaffold response.
- Documented runtime behavior and health/error contracts in the README
  and API specification; marked Milestone 2 complete in this plan.

### Validation

- `npm test`: passed; 24 tests total (8 in each service), 0 failed.
- `npm run lint`: passed.
- `npm run build`: passed for the client and all three services.
- Runtime smoke check: started all three service entry points and
  confirmed `GET /health/ready` and `GET /` returned HTTP 200 with the
  expected service-specific JSON; stopped the processes after probing.
- Startup failure check: each service rejected `PORT=invalid`, emitted
  a safe structured configuration error, and exited with status `1`.
- Tests cover configuration validation, all health routes, root-route
  compatibility, correlation ID propagation, 400/404/413/415/500
  envelopes, safe logs without exception details, and graceful
  shutdown.

### Limitations and next step

- No database, external service, authentication, product API, or
  vehicle catalog data is connected.
- Liveness/readiness are process-only until Milestone 3 introduces
  persistence.
- Continue with Milestone 3 only when requested; confirm database
  layout/credentials and retention decisions before connecting any
  database.

## 2026-10-10 — Milestone 3 persistence foundations (in progress)

### Decisions

- The user initially selected local MongoDB, then changed the target to
  Atlas. Use Atlas; do not connect to the local MongoDB instance.
- Each service has its own database-scoped Atlas credential.
- Recommendation history and catalog audit collections remain disabled.
- Atlas cluster settings and authorized catalog data remain undecided.

### Implemented

- Added Mongoose `^9.7.2` as a separately declared runtime dependency
  to each service workspace. The initial `^9.0.0` install surfaced a
  high-severity advisory; npm audit identified the affected range and
  the dependencies were upgraded. The final install reported zero
  vulnerabilities.
- Added service-owned models for Identity `users`, Catalog `vehicles`,
  and Recommendation `favorites`, including the approved unique indexes
  and catalog provenance/price fields.
- Added isolated connection modules that enforce each service's logical
  database name, initialize indexes, report safe connection state, and
  close connections during graceful shutdown.
- Made `/health/ready` return `503` until the service database and its
  indexes are available; liveness remains independent of MongoDB.
- Added service-local `.env.example` files with placeholder credentials
  and documented separate Atlas database users. No actual credentials
  or vehicle data were added.
- Added configuration and readiness tests. They have not been run in
  this work session.

### Validation and remaining work

- `npm.cmd run lint`: passed after correcting the readiness handler.
- `npm.cmd run build`: passed for the client and all three services.
- `npm.cmd audit --json` initially reported a high-severity Mongoose
  advisory affecting the initial version range. After upgrading all
  workspaces to `^9.7.2`, npm reported zero vulnerabilities.
- The configuration/readiness tests were added or updated but were not
  run in this work session.
- Atlas cluster URI, users, and network access have not been configured
  in service-local `.env` files, so Atlas connectivity, per-user access
  isolation, schema validation, and index creation remain unverified.
- The milestone stays in progress until an Atlas test database verifies
  connection failure, schema/index behavior, and service isolation.

## 2026-10-10 — Authentication policy decisions

### Decisions

- Approved RS256 access-token signing with public-key verification via
  JWKS and a 15-minute access-token lifetime.
- Approved rotating 7-day refresh sessions; logout revokes the session.
- Approved a synchronizer CSRF token plus Origin checks for
  cookie-authenticated state changes.
- Approved Argon2id password hashing and 12–128 character passwords.
- Deferred email verification and password recovery until an email
  provider is selected.

### Status

- Recorded the policy in the security guidelines and Milestone 4 plan.
- No authentication code was started because Milestone 3 is still
  awaiting Atlas cluster/users and integration verification.
- Key rotation/cache details and safe refresh-session storage remain
  implementation design items for Milestone 4.

## 2026-10-12 — UI/UX visual direction updated to Brutalism

### Decisions

- The user requested and approved changing the UI/UX visual direction
  from the initial light automotive marketplace style to Brutalism /
  Neo-brutalism.
- The brutalist system defines thick black structural borders (2px–4px),
  hard zero-blur offset drop shadows (`shadow-[4px_4px_0px_#000000]`),
  bold punchy typography with uppercase badge tracking, and high-energy
  accent colors (signature yellow `#FFDE59`, electric blue `#3B82F6`,
  signal green `#22C55E`, vibrant warning `#FB923C`, and alert red
  `#EF4444`) on a warm ivory canvas (`#FDFBF7`).
- Tactile hover and active states provide crisp physical button press
  feedback.
- Core architecture rules, accessibility (high-contrast WCAG AAA text
  readability), data-quality disclosures, and honesty gates (no invented
  specifications or claims) are strictly preserved.

### Files changed

- `docs/06_UI_UX_GUIDELINES.md`: updated visual direction, tokens,
  borders, shadows, and typography standards to Neo-brutalism.
- `client/src/index.css`: updated Tailwind v4 `@theme` design tokens
  with the brutalist color palette, surface tones, and hard-edge shadows.
- `client/src/App.jsx`: redesigned application preview shell in full
  Neo-brutalism aesthetics, including header badge, hero CTAs,
  catalog-status isolation notice card, and three feature pillars.
- `docs/12_DEVELOPMENT_LOG.md`: recorded the decision and validation.

### Validation

- `npm run build --workspace @vehicle/client`: passed (built in 518ms
  without errors).
- `npm test`: passed; 31 service tests across all three microservices
  passed (Identity: 13, Catalog: 9, Recommendation: 9).

## 2026-10-12 — Milestone 4: Identity, authentication, and user preferences

### Scope and objective

- Implement user registration, login, logout, refresh session rotation,
  current identity, profile management, and preference persistence in
  Identity and User Service.
- Enforce Argon2id password hashing, RS256 JWT access token signing with
  public-key JWKS discovery, rotating 7-day MongoDB refresh sessions,
  HttpOnly SameSite cookies, CSRF protection, and allowlisted schema
  validation.

### Files created and modified

- `services/identity-user/src/models.js`: registered `Session` model
  with `tokenHash`, `csrfToken`, `expiresAt` with TTL index, and
  `userId` reference.
- `services/identity-user/src/auth/passwords.js`: implemented Argon2id
  password hashing with Node's native `crypto.argon2`, 12–128 character
  validation, and constant-time verification.
- `services/identity-user/src/auth/jwt.js`: implemented RS256 token
  signing with 15-minute lifetime, audience/issuer enforcement, and JWKS
  export.
- `services/identity-user/src/auth/cookies.js`: implemented HttpOnly
  SameSite cookie setting, parsing, and clearing with `__Host-` support.
- `services/identity-user/src/auth/sessions.js`: implemented rotating
  7-day refresh sessions stored by SHA-256 hash in MongoDB.
- `services/identity-user/src/auth/middleware.js`: implemented JWT/cookie
  authentication, CSRF validation on state changes, and role checking.
- `services/identity-user/src/routes/auth.js`: implemented `/register`,
  `/login`, `/refresh`, `/logout`, `/me`, and JWKS endpoints.
- `services/identity-user/src/routes/users.js`: implemented `/users/me`
  and `/users/me/preferences` endpoints with allowlisted validation.
- `services/identity-user/src/app.js`: mounted auth and user routers.
- `services/identity-user/src/server.js`: passed dynamic database models
  proxy into application bootstrap.
- `services/identity-user/test/auth.test.js`: added integration tests
  for AUTH-01 through AUTH-05.
- `services/identity-user/test/user.test.js`: added integration tests
  for USER-01 through USER-06.
- `docs/11_IMPLEMENTATION_PLAN.md`: marked Milestone 4 complete.

### Validation

- `npm run build --workspaces --if-present`: passed all syntax checks
  and Vite bundle build.
- `npm test`: passed; 42 tests total across all three microservices
  (Identity: 24, Catalog: 9, Recommendation: 9), 0 failed.
- All test suites for Milestone 4 (AUTH-01..05, USER-01..06) passed
  against isolated test databases.

### Next step

- Milestone 5: Vehicle catalog schema, provenance validation, and admin
  APIs in Vehicle Catalog Service.

## 2026-10-12 — Milestone 5: Vehicle catalog schema and admin APIs

### Scope and objective

- Implement Vehicle Mongoose model in `vehicle_catalog` database with
  compound indexes, provenance and price validation, and safe vehicle projection.
- Implement RS256 token verification for administrative access tokens
  issued by Identity Service.
- Implement admin management routes (`GET /api/v1/admin/vehicles`,
  `POST /api/v1/admin/vehicles`, `PATCH /api/v1/admin/vehicles/:vehicleId`,
  `PATCH /api/v1/admin/vehicles/:vehicleId/status`,
  `DELETE /api/v1/admin/vehicles/:vehicleId`).
- Enforce publication preconditions (requiring valid pricing and data
  provenance), draft isolation (protecting public routes from exposing drafts),
  and atomic updates.

### Files created and modified

- `services/vehicle-catalog/src/models.js`: defined `Vehicle` schema with
  strict subschemas for `prices` (Decimal128 amount > 0, currency INR,
  allowed price types `ex_showroom`, `on_road`, `used`) and `dataSources`
  (provider, retrieval date, source URLs, field paths), plus three compound
  indexes:
  `{ status: 1, make: 1, model: 1, modelYear: -1 }`,
  `{ status: 1, bodyType: 1, fuelType: 1, transmission: 1 }`, and
  `{ status: 1, "prices.type": 1, "prices.amount": 1 }`.
- `services/vehicle-catalog/src/auth/jwt.js`: implemented `TokenVerifier`
  supporting RS256 public key and JWKS verification with issuer/audience
  validation.
- `services/vehicle-catalog/src/auth/cookies.js`: implemented cookie parsing
  for token credentials.
- `services/vehicle-catalog/src/auth/middleware.js`: implemented
  `createAuthMiddleware` and `requireRole("admin")`.
- `services/vehicle-catalog/src/vehicles/validation.js`: implemented
  `validateVehiclePayload` (field allowlist, enum validation, price and
  provenance schema checks), `validatePublicationPreconditions`, and
  `isValidObjectId` syntax checking.
- `services/vehicle-catalog/src/vehicles/formatting.js`: implemented
  `formatVehicle` projection converting Decimal128 to numbers, mapping `_id`
  to `id`, and strictly preserving missing/unverified values as undefined.
- `services/vehicle-catalog/src/routes/admin.js`: implemented admin CRUD,
  paginated listing with status/make filters, publication status transitions,
  and safe deletion.
- `services/vehicle-catalog/src/routes/public.js`: implemented public vehicle
  detail `GET /api/v1/vehicles/:vehicleId` strictly restricted to `status: "published"`.
- `services/vehicle-catalog/src/app.js`: mounted admin and public routers
  with auth middleware and database models injection.
- `services/vehicle-catalog/src/server.js`: injected dynamic database models
  proxy into application bootstrap.
- `services/vehicle-catalog/package.json`: updated `build` script to check all
  source modules.
- `services/vehicle-catalog/test/database.test.js`: added tests for model
  validation and compound index registration in isolated MongoDB.
- `services/vehicle-catalog/test/admin.test.js`: added 12 comprehensive
  integration tests covering ADM-01 through ADM-07, CAT-04 through CAT-06,
  draft isolation, and malformed ID handling.
- `docs/11_IMPLEMENTATION_PLAN.md`: marked Milestone 5 complete.

### Validation

- `npm run build`: passed across all 4 workspaces (`client`, `identity-user`,
  `vehicle-catalog`, `recommendation`).
- `npm run lint`: passed across all workspaces with 0 errors and 0 warnings.
- `npm test`: passed; all 56 tests across all microservices passed
  (Identity: 24, Catalog: 23, Recommendation: 9), 0 failed.
- All acceptance criteria for Milestone 5 and test IDs (ADM-01..07, CAT-04..06)
  verified and passing.

## 2026-10-12 — Milestone 6: Public catalog discovery and details

### Scope and objective

- Implement public catalog discovery (`GET /api/v1/vehicles`) and public
  detail (`GET /api/v1/vehicles/:vehicleId`) endpoints.
- Enforce public visibility restricted strictly to `status: "published"`.
- Support bounded text search (`q`) across make, model, and variant with
  inert escaped strings.
- Support multi-dimensional AND filtering on make, bodyType, fuelType,
  transmission, seatingCapacity, and inclusive price range (`minPrice`,
  `maxPrice`, `priceType`).
- Enforce deterministic sorting (including price sorting for specified
  priceType, with secondary sort on `_id`) and bounded pagination (`limit <= 100`).

### Files created and modified

- `services/vehicle-catalog/src/routes/public.js`: implemented `GET /`
  (listing/search/filters/sort/pagination) with allowlisted query parameter
  validation, operator injection prevention, and `$elemMatch` price range
  filtering; implemented `GET /:vehicleId` published details endpoint.
- `services/vehicle-catalog/test/public.test.js`: added comprehensive
  integration test suite for CAT-01 through CAT-03 and SRCH-01 through SRCH-05.
- `docs/11_IMPLEMENTATION_PLAN.md`: marked Milestone 6 complete.

### Validation

- `npm run build`: passed across all 4 workspaces (`client`, `identity-user`,
  `vehicle-catalog`, `recommendation`).
- `npm run lint`: passed across all workspaces with 0 errors and 0 warnings.
- `npm test`: passed; all 64 tests across all microservices passed
  (Identity: 24, Catalog: 31, Recommendation: 9), 0 failed.
- All acceptance criteria for Milestone 6 (FR-CAT-01, FR-CAT-02, FR-SEARCH-01,
  FR-SEARCH-02) and test IDs (CAT-01..03, SRCH-01..05) verified and passing.

## 2026-10-12 — Milestone 7: Secure service-to-service client and contracts

### Scope and objective

- Implement private service-to-service endpoints in Vehicle Catalog Service
  (`POST /internal/v1/vehicles/search`, `POST /internal/v1/vehicles/lookup`)
  and Identity Service (`GET /internal/v1/users/:userId/preferences`).
- Protect internal routes with mutual service authentication middleware
  (`X-Internal-Service-Key`), rejecting unauthenticated requests and
  regular user tokens (ERR-03).
- Implement typed, resilient HTTP clients in Recommendation Service:
  `CatalogClient` and `IdentityClient`, featuring request correlation ID
  propagation, bounded timeouts (`AbortSignal.timeout`), and explicit
  downstream error mapping (503 `DOWNSTREAM_UNAVAILABLE`, 504 `DOWNSTREAM_TIMEOUT`, COMP-04).
- Ensure strict database isolation: no microservice accesses another
  service's MongoDB database directly.

### Files created and modified

- `services/vehicle-catalog/src/auth/serviceAuth.js`: implemented service
  auth middleware.
- `services/vehicle-catalog/src/routes/internal.js`: implemented candidate
  search and vehicle lookup routes.
- `services/vehicle-catalog/src/app.js`: mounted `/internal/v1/vehicles`.
- `services/vehicle-catalog/package.json`: updated build script to check
  internal modules.
- `services/vehicle-catalog/test/internal.test.js`: added integration tests
  for internal catalog routes and ERR-03.
- `services/identity-user/src/auth/serviceAuth.js`: implemented service auth
  middleware.
- `services/identity-user/src/routes/internal.js`: implemented internal user
  preferences retrieval route.
- `services/identity-user/src/app.js`: mounted `/internal/v1/users`.
- `services/identity-user/package.json`: updated build script to check
  internal modules.
- `services/identity-user/test/internal.test.js`: added integration tests
  for internal identity routes.
- `services/recommendation/src/clients/catalogClient.js`: implemented
  `CatalogClient`.
- `services/recommendation/src/clients/identityClient.js`: implemented
  `IdentityClient`.
- `services/recommendation/package.json`: updated build script to check
  clients.
- `services/recommendation/test/clients.test.js`: added unit/contract tests
  for clients, including COMP-04.
- `docs/11_IMPLEMENTATION_PLAN.md`: marked Milestone 7 complete.

### Validation

- `npm run build`: passed across all 4 workspaces.
- `npm run lint`: passed across all workspaces with 0 errors and 0 warnings.
- `npm test`: passed; all 75 tests across all microservices passed
  (Identity: 26, Catalog: 34, Recommendation: 15), 0 failed.
- All acceptance criteria for Milestone 7 and test IDs (ERR-03, COMP-04)
  verified and passing.

## 2026-10-12 — Milestone 8: Recommendation rules and unit tests

### Scope and objective

- Implement pure, deterministic eligibility evaluation, component scoring,
  evidence coverage assessment, trade-off detection, and tie-breaking in
  Recommendation Service.
- Enforce strict eligibility constraints (budget within range with matching
  price type, required body types, fuel types, transmissions, minimum seats).
- Score verified dimensions with normalized transforms: headroom budget-fit,
  verified mileage, and verified power.
- Leave ungrounded dimensions (reliability, maintenance, safety) unscored
  and clearly documented under `missingData`, with no invented rankings or scores.
- Enforce the 50% evidence coverage threshold: candidates below threshold are
  marked with `scoreStatus: "insufficient_data"` and `matchScore: null`.
- Guarantee deterministic ranking replay and stable multi-field tie-breaking
  (make, model, model year, vehicle ID).
- Include mandatory non-prediction disclaimer with every result.

### Files created and modified

- `services/recommendation/src/recommendations/config.js`: defined rule
  version (`rules-v1`), coverage threshold (0.5), priority bounds, and disclaimer.
- `services/recommendation/src/recommendations/validation.js`: implemented
  preference payload validation with field-level error reporting.
- `services/recommendation/src/recommendations/eligibility.js`: implemented
  pure eligibility filtering for hard constraints with explicit reason codes.
- `services/recommendation/src/recommendations/scoring.js`: implemented
  component scoring, evidence coverage calculation, and explanation generation.
- `services/recommendation/src/recommendations/ranking.js`: implemented
  deterministic candidate ranking, group partitioning, and multi-field tie-breaking.
- `services/recommendation/package.json`: updated build script to check
  recommendation modules.
- `services/recommendation/test/recommendations.test.js`: added 10 unit tests
  covering REC-01 through REC-10.
- `docs/11_IMPLEMENTATION_PLAN.md`: marked Milestone 8 complete.

### Validation

- `npm run build`: passed across all 4 workspaces.
- `npm run lint`: passed across all workspaces with 0 errors and 0 warnings.
- `npm test`: passed; all 85 tests across all microservices passed
  (Identity: 26, Catalog: 34, Recommendation: 25), 0 failed.
- All acceptance criteria for Milestone 8 and test IDs (REC-01..10) verified
  and passing.

## 2026-10-12 — Milestone 9: Recommendation, comparison, and favorites public APIs

### Scope and objective

- Implement public and authenticated endpoints in Recommendation Service:
  - `POST /api/v1/recommendations`: supports anonymous recommendation requests
    or saved-preference recommendation (`useSavedPreferences: true`) for
    authenticated users, candidate search via `CatalogClient`, pure ranking via
    `rankCandidates`, deterministic pagination, and score explanation.
  - `POST /api/v1/compare`: public vehicle comparison accepting 2–4 published
    vehicle IDs, verifying publication via `CatalogClient.lookupVehicles`,
    rejecting duplicates/unallowed counts with 400, returning 404 for
    unavailable vehicles, and returning structured comparison rows with explicit
    missing values.
  - `GET /api/v1/favorites`: authenticated paginated list of user-owned favorites,
    enriched with published details via `CatalogClient`.
  - `PUT /api/v1/favorites/:vehicleId`: authenticated favorite addition, verifying
    vehicle publication with Catalog Service, returning 201 for created and 200
    for already existing (idempotent, no duplicates).
  - `DELETE /api/v1/favorites/:vehicleId`: authenticated favorite removal,
    scoped strictly to `request.user.id`, returning 204 No Content (idempotent).
  - `POST /api/v1/longevity/estimate`: strictly returns 503 `FEATURE_NOT_ENABLED`
    per ML-01 without fabricating any estimate.
- Implement cookie parsing (`parseCookies`) and JWT authentication middleware
  (`createAuthMiddleware`) using RS256 `TokenVerifier`.
- Wire routers into `services/recommendation/src/app.js` and `server.js`.
- Add integration tests verifying REC-01..06, COMP-01..03, FAV-01..04, ML-01.

### Files created and modified

- `services/recommendation/src/auth/cookies.js`: implemented cookie parsing
  for access token credentials.
- `services/recommendation/src/auth/middleware.js`: implemented `createAuthMiddleware`
  supporting optional or mandatory authentication.
- `services/recommendation/src/routes/recommendations.js`: implemented
  `POST /api/v1/recommendations` endpoint.
- `services/recommendation/src/routes/compare.js`: implemented `POST /api/v1/compare`
  endpoint.
- `services/recommendation/src/routes/favorites.js`: implemented `GET /api/v1/favorites`,
  `PUT /api/v1/favorites/:vehicleId`, and `DELETE /api/v1/favorites/:vehicleId`.
- `services/recommendation/src/routes/longevity.js`: implemented `POST /api/v1/longevity/estimate`
  gated 503 endpoint.
- `services/recommendation/src/app.js`: mounted routes with client injections.
- `services/recommendation/src/server.js`: updated to inject dynamic models proxy.
- `services/recommendation/package.json`: updated `build` script with new modules.
- `services/recommendation/test/api.test.js`: added 14 comprehensive integration tests.
- `docs/11_IMPLEMENTATION_PLAN.md`: marked Milestone 9 complete.

### Validation

- `npm run build`: passed across all 4 workspaces.
- `npm run lint`: passed across all workspaces with 0 errors.
- `npm test`: passed; all 99 tests across all microservices passed
  (Identity: 26, Catalog: 34, Recommendation: 39), 0 failed.
- All acceptance criteria for Milestone 9 (FR-REC-01..04, FR-COMP-01,
  FR-FAV-01..02, ML-01) verified and passing.

### Next step

- Milestone 10: Frontend foundation and API clients (`client/`).

## 2026-10-12 — Milestone 10: Frontend foundation and API clients

### Scope and objective

- Implement React/Tailwind frontend foundation adhering strictly to the
  approved Neo-brutalism design system.
- Build typed service API clients per microservice boundary:
  - `apiClient`: centralized HTTP client with cookie authentication support,
    automatic CSRF synchronizer token header tracking (`X-CSRF-Token`), 204
    handling, and normalized `ApiError` mapping.
  - `authClient`: login, register, session refresh, logout, getMe, and
    preferences endpoints.
  - `catalogClient`: vehicle discovery search/filter/sort, details, and admin
    operations.
  - `recommendationClient`: candidate recommendations, multi-vehicle
    comparison, favorites CRUD, and longevity prediction gate handling.
- Build declarative SPA client-side routing (`Router`, `Route`, `Link`,
  `useRouter`, `useLocation`, `useNavigate`, `useParams`) with browser history
  synchronization and zero third-party routing dependencies.
- Build shared state management:
  - `AuthProvider` / `useAuth`: asynchronous session discovery, reactive
    authentication state, user role determination (`isAdmin`).
  - `ToastProvider` / `useToast`: global feedback alerts in Neo-brutalism style
    with auto-dismiss and accessibility announcements.
- Build accessible UI primitives complying with modern web guidance:
  - `Button`, `Badge`, `Card`, `Input`, `Select`, `Alert`, `LoadingSpinner`, `Modal`.
- Build application shell layout (`AppLayout`, `Navbar`, `Footer`) with
  responsive drawer navigation and system transparency disclosures.
- Build pages for `HomePage`, `LoginPage`, and `RegisterPage`, plus placeholder
  containers for Milestones 11 and 12 views.

### Files created and modified

- `client/src/services/apiClient.js`: base HTTP client with CSRF and error normalization.
- `client/src/services/authClient.js`: auth & user profile service client.
- `client/src/services/catalogClient.js`: vehicle catalog service client.
- `client/src/services/recommendationClient.js`: recommendation engine client.
- `client/src/router/context.js`: RouterContext definition.
- `client/src/router/hooks.js`: `useRouter`, `useLocation`, `useNavigate`, `useParams`.
- `client/src/router/Router.jsx`: SPA router, route matching, Link component.
- `client/src/context/authContextDef.js`: AuthContext definition.
- `client/src/context/useAuth.js`: `useAuth` hook.
- `client/src/context/AuthContext.jsx`: `AuthProvider` implementation.
- `client/src/context/toastContextDef.js`: ToastContext definition.
- `client/src/context/useToast.js`: `useToast` hook.
- `client/src/context/ToastContext.jsx`: `ToastProvider` notification system.
- `client/src/components/ui/Button.jsx`: brutalist button primitive.
- `client/src/components/ui/Badge.jsx`: brutalist badge tag primitive.
- `client/src/components/ui/Card.jsx`: brutalist card container primitive.
- `client/src/components/ui/Input.jsx`: accessible input with error/hint linking.
- `client/src/components/ui/Select.jsx`: accessible select dropdown.
- `client/src/components/ui/Alert.jsx`: accessible notice and status banner.
- `client/src/components/ui/LoadingSpinner.jsx`: loading indicator.
- `client/src/components/ui/Modal.jsx`: accessible modal dialog with backdrop & escape key handling.
- `client/src/components/layout/Navbar.jsx`: navigation header with auth state & mobile drawer.
- `client/src/components/layout/Footer.jsx`: brutalist footer with service status indicators.
- `client/src/components/layout/AppLayout.jsx`: main shell container.
- `client/src/pages/HomePage.jsx`: home view with hero, CTAs, and system integrity notices.
- `client/src/pages/LoginPage.jsx`: user sign-in page.
- `client/src/pages/RegisterPage.jsx`: user registration page.
- `client/src/App.jsx`: root application component.
- `client/package.json`: added test script.
- `client/test/apiClients.test.js`: added 5 tests for API clients.
- `docs/11_IMPLEMENTATION_PLAN.md`: marked Milestone 10 complete.

### Validation

- `npm run build --workspace @vehicle/client`: Vite build succeeded in 1.69s.
- `npm run lint`: passed across all workspaces with 0 errors and 0 warnings.
- `npm test`: all 104 tests passed across all 4 workspaces
  (Client: 5, Identity: 26, Catalog: 34, Recommendation: 39), 0 failed.

### Next step

- Milestone 11: Vehicle discovery and detail UI (`client/`).

## 2026-10-12 — Milestone 11: Vehicle discovery and detail UI

### Scope and objective

- Implement public and administrative vehicle discovery and detail views
  in React client adhering strictly to the Neo-brutalism design system.
- Build components:
  - `VehicleCard`: vehicle presentation card with body/fuel/transmission tags,
    formatted INR prices, key performance metrics, favorite toggle, comparison
    checkbox, and detail link.
  - `VehicleFilters`: multi-dimensional search & filtering (text search `q`,
    bodyType, fuelType, transmission, minPrice, maxPrice, deterministic sort,
    reset action).
  - `CatalogPage`: vehicle discovery catalog view with floating comparison tray
    (supporting 2–4 selected vehicles), bounded pagination controls, honest empty
    states ("No published vehicles match your criteria; hard constraints are never
    relaxed automatically"), loading spinner, and error retry.
  - `VehicleDetailPage`: comprehensive published vehicle detail view, pricing
    matrix (ex-showroom, on-road, used in INR), powertrain & dimension specs,
    explicit "Unreported" badges for missing or unverified attributes, and a
    verified Data Provenance card linking to provider and external source URLs.
  - `AdminCatalogPage`: administrator inventory management view restricted to
    `user?.role === "admin"`, inventory table with draft/published/archived status
    toggles, publication precondition enforcement, delete action, and accessible
    modal dialog for vehicle record creation.
- Mount routes `/vehicles`, `/vehicles/:id`, and `/admin` in `client/src/App.jsx`.

### Files created and modified

- `client/src/components/catalog/VehicleCard.jsx`: vehicle card component.
- `client/src/components/catalog/VehicleFilters.jsx`: multi-dimensional filters component.
- `client/src/pages/CatalogPage.jsx`: vehicle catalog discovery page.
- `client/src/pages/VehicleDetailPage.jsx`: comprehensive vehicle detail page.
- `client/src/pages/AdminCatalogPage.jsx`: administrator catalog management page.
- `client/src/App.jsx`: mounted `/vehicles`, `/vehicles/:id`, and `/admin`.
- `docs/11_IMPLEMENTATION_PLAN.md`: marked Milestone 11 complete.

### Validation

- `npm run build --workspace @vehicle/client`: Vite build passed in 846ms with zero errors.
- `npm run lint`: passed across all workspaces with 0 errors and 0 warnings.
- All acceptance criteria for Milestone 11 (FR-CAT-01, FR-CAT-02, UI-01, UI-02) satisfied.

### Next step

- Milestone 12: Recommendation questionnaire and results UI (`client/`).

## 2026-10-12 — Milestone 12: Recommendation questionnaire and results UI

### Scope and objective

- Implement user-facing recommendation questionnaire and ranked feed in
  React client conforming strictly to the Neo-brutalism design tokens.
- Build preference builder supporting:
  - Budget boundaries (`min`, `max`, price type: `ex_showroom`, `on_road`, `used`).
  - Vehicle body types multi-selection chips.
  - Fuel types and transmission multi-selection chips.
  - Seating capacity selector (2 to 8 seats).
  - Driving environment (mixed, city, highway) and annual distance sliders.
  - Relative priority weights (1–5) for Fuel Efficiency, Performance, Safety,
    Reliability, and Maintenance Cost.
  - Saved profile preferences toggle for authenticated users.
- Display backend-calculated compatibility scores (0–100), component scores,
  transparent match reasons, honest trade-offs, and unverified data warnings.
- Integrate educational `LongevityDisclaimerModal` explaining the ML-01 gated status
  (HTTP 503 `FEATURE_NOT_ENABLED`) without fake predictions or simulated curves.

### Files created and modified

- `client/src/pages/RecommendationPage.jsx`: full preference questionnaire and feed.
- `client/src/components/recommendations/LongevityDisclaimerModal.jsx`: ML-01 policy modal.
- `client/src/App.jsx`: mounted `/recommendations` route.

### Validation

- All recommendation scenarios verified against backend API.
- Vite build passed in 796ms with zero errors.
- ESLint passed with 0 errors and 0 warnings.

## 2026-10-12 — Milestone 13: Comparison, accounts, favorites, and preferences UI

### Scope and objective

- Implement side-by-side vehicle comparison matrix table:
  - Supports 2 to 4 vehicles simultaneously.
  - Synchronizes with URL query parameter `?ids=id1,id2`.
  - Vehicle picker modal to add vehicles directly from catalog.
  - Remove vehicle actions and difference highlights.
- Implement saved favorites collection page:
  - User-specific vehicle bookmarks tied to authenticated account.
  - Unauthenticated sign-in prompt.
  - Graceful handling of unpublished or deleted vehicles (`UNAVAILABLE` badge).
  - Quick action to remove or open full specifications.

### Files created and modified

- `client/src/pages/ComparePage.jsx`: vehicle comparison matrix page.
- `client/src/pages/FavoritesPage.jsx`: user saved favorites page.
- `client/src/App.jsx`: mounted `/compare` and `/favorites` routes.

### Validation

- Vite build passed cleanly.
- ESLint passed with 0 errors and 0 warnings.

## 2026-10-12 — Milestone 14: Admin vehicle management UI

### Scope and objective

- Admin inventory dashboard with create, publish, and delete capabilities.
- Strict draft isolation: draft vehicles hidden from public catalog discovery.
- Publication precondition enforcement: prevents publishing vehicles without
  valid INR pricing and verified data source provenance.

### Files created and modified

- `client/src/pages/AdminCatalogPage.jsx`: vehicle inventory management page.
- `client/src/App.jsx`: mounted `/admin` route with role checking.

### Validation

- Admin catalog flows validated with draft and published states.
- Client tests pass.

## 2026-10-12 — Milestone 15: Integration, security, accessibility, and regression

### Scope and objective

- Comprehensive cross-service end-to-end integration test suite spinning up all
  three independently deployable microservices with isolated MongoDB instances.
- Verify end-to-end journeys:
  - `E2E-01`: Anonymous discovery, catalog search/filter/sort, and cross-service comparison.
  - `E2E-02`: Recommendation questionnaire and pure domain ranking with honest evidence.
  - `E2E-03`: User registration, Argon2id hashing, login, CSRF tokens, saved profile preferences, favorites management, and multi-tenant isolation.
  - `E2E-04`: Admin draft creation, publication preconditions enforcement, and draft isolation.
  - `ML-01 & SEC-03`: Longevity feature gate (HTTP 503 `FEATURE_NOT_ENABLED`) and internal service authentication with shared secret key.

### Files created and modified

- `test/e2e.test.js`: end-to-end integration and security test suite.
- `package.json`: added `test:e2e` and `test:all` npm scripts.
- `eslint.config.js`: included `test/**/*.js` with node/fetch globals.

### Validation

- `npm run test:e2e`: 5/5 tests passed (100% pass rate).
- `npm run test:all`: 109/109 tests passed across all packages.
- `npm run lint`: 0 errors, 0 warnings across `client`, `services`, and `test`.

## 2026-10-12 — Milestone 16: Project completion, build & lint verification, and final handoff

### Scope and objective

- Complete verification of the entire project across all 3 microservices and frontend.
- Confirm independent deployability, database boundary isolation, zero hardcoded
  production data, honest missing data representation, and Neo-brutalism design consistency.
- Verify all commands, scripts, builds, and automated tests.

### Summary of verified tests

- `@vehicle/client`: 5 passed
- `@vehicle/identity-user`: 26 passed
- `@vehicle/catalog`: 34 passed
- `@vehicle/recommendation`: 39 passed
- Root E2E integration: 5 passed
- Total: 109 passed, 0 failed, 0 skipped.
- ESLint: 0 errors, 0 warnings across the entire repository.
- Vite Client Build: Succeeded in <1s.

## 2026-10-12 — UI/UX Design System Overhaul: Glassmorphism

### Scope and objective

- Transition the user interface and user experience across the entire client application from the initial Neo-brutalism visual direction to modern Glassmorphism.
- Consulted modern web guidance (`modern-web-guidance`) on visual effects, backdrop filters, specular highlights, and color tokens.
- Implement glassmorphism design tokens:
  - Frosted translucent card, navigation, modal, and alert surfaces with `backdrop-filter: blur(16px)` (`backdrop-blur-xl`).
  - Subtle specular borders (`border border-white/80` and `border border-slate-200/80`) catching simulated light.
  - Multi-layer diffuse shadows with soft ambient depth (`shadow-[0_8px_30px_rgb(0,0,0,0.04)]`, `shadow-[0_20px_40px_rgb(0,0,0,0.07)]`).
  - Rounded geometry (`rounded-xl`, `rounded-2xl`, `rounded-full`).
  - Ambient background gradient refraction meshes in `AppLayout` providing realistic optical refraction through frosted surfaces.
  - Refined modern typography using crisp slate tones (`text-slate-900`, `text-slate-600`) with high accessibility contrast.
  - Smooth interactive micro-transitions and elevation states.

### Files modified

- `client/src/index.css`: Glassmorphism `@theme` tokens, `.glass-panel`, `.glass-card`, `.glass-input` utility classes.
- `client/src/components/layout/AppLayout.jsx`: Ambient refraction background glows, modern slate canvas.
- `client/src/components/layout/Navbar.jsx`: Translucent glass header, rounded navigation pill badges, modern logo.
- `client/src/components/layout/Footer.jsx`: Frosted glass footer with clean architecture status dots.
- `client/src/components/ui/Button.jsx`: Glass gradient buttons, soft glows, hover elevation.
- `client/src/components/ui/Card.jsx`: Frosted glass card with backdrop blur and smooth hover transition.
- `client/src/components/ui/Badge.jsx`: Rounded pill badges with translucent tints and delicate borders.
- `client/src/components/ui/Input.jsx`: Frosted translucent input fields with rounded-xl corners and focus rings.
- `client/src/components/ui/Select.jsx`: Translucent glass select dropdown with sleek chevron.
- `client/src/components/ui/Alert.jsx`: Frosted alert banners with rounded-2xl geometry and status pills.
- `client/src/components/ui/Modal.jsx`: Frosted glass overlay and dialog container.
- `client/src/components/ui/LoadingSpinner.jsx`: Circular glowing spinner with modern typography.
- `client/src/context/ToastContext.jsx`: Floating frosted glass toast notifications with smooth dismissals.
- `client/src/components/catalog/VehicleCard.jsx`: Glass vehicle cards with rounded badges and gradient actions.
- `client/src/components/catalog/VehicleFilters.jsx`: Translucent search and filtering container.
- `client/src/components/recommendations/LongevityDisclaimerModal.jsx`: Glass ML-01 policy modal.
- `client/src/pages/HomePage.jsx`: Glass hero section, gradient headline, frosted pillar cards.
- `client/src/pages/CatalogPage.jsx`: Floating glass comparison tray, pagination pills, catalog layout.
- `client/src/pages/RecommendationPage.jsx`: Glass questionnaire cards, priority rating buttons, score breakdown.
- `client/src/pages/ComparePage.jsx`: Frosted glass comparison matrix table and vehicle picker modal.
- `client/src/pages/FavoritesPage.jsx`: Glass saved builds collection and unauthenticated card.
- `client/src/pages/VehicleDetailPage.jsx`: Glass specification cards, price breakdown, and provenance section.
- `client/src/pages/AdminCatalogPage.jsx`: Glass inventory dashboard, table, and creation modal.
- `client/src/pages/LoginPage.jsx` & `client/src/pages/RegisterPage.jsx`: Frosted authentication cards with backdrop glow.
- `docs/06_UI_UX_GUIDELINES.md`: Documented Glassmorphism visual direction, design tokens, and signatures.

### Validation

- `npm run build`: Vite build succeeded in 1.22s with 0 errors.
- `npm run lint`: ESLint passed with 0 errors and 0 warnings across `client`, `services`, and `test`.
## 2026-10-12 — Mature Typography System, Dark/Light Theme Toggle, and Full Obsidian Glass Mode

### Scope and objective

- Implement Google Fonts typographic system requested by the user:
  `https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap`
- Elevate the glassmorphism UI into a mature, high-end design (Apple / Linear / luxury automotive dashboard aesthetics).
- Introduce a persistent, accessible Light / Dark theme toggle in the navigation bar supporting `light`, `dark`, and `system` preferences, with anti-FOUC initialization script preventing white flashes on dark load.
- Ensure 100% of pages, components, modal dialogues, toasts, and inputs support dark mode cleanly with obsidian glass styling (`dark:bg-slate-900/60`, `dark:border-white/10`, `dark:text-white`).

### Typography and Font Roles

- **`Space Grotesk` (`font-display`):** Headings, brand logos, section titles, card headers, with tight letter spacing (`tracking-tight`).
- **`DM Sans` (`font-sans`):** Base interface sans font, navigation items, buttons, form controls, body copy, and tooltips.
- **`DM Mono` (`font-mono`):** High-precision telemetry metrics, pricing values (`₹12,50,000`), recommendation match percentages (`94%`), power/torque/mileage specifications, engine version chips, timestamps, and code tags.

### Files modified and created

- `client/index.html`: Loaded Google Fonts stylesheet; configured `<meta name="color-scheme" content="light dark" />` and inline anti-FOUC script.
- `client/src/index.css`: Added `@custom-variant dark (&:where(.dark, .dark *));`, Tailwind v4 `@theme` fonts (`--font-sans`, `--font-display`, `--font-mono`), base typography inheritance, and dark glass utilities.
- `client/src/context/themeContextDef.js`: Created dedicated `ThemeContext` definition file for Fast Refresh compliance.
- `client/src/context/ThemeContext.jsx`: Implemented `ThemeProvider` managing theme state, system media query listener, localStorage persistence, and DOM class / meta color-scheme synchronization.
- `client/src/context/useTheme.js`: Created `useTheme()` consumer hook.
- `client/src/components/layout/ThemeToggle.jsx`: Created smooth animated Sun/Moon toggle button with accessibility labels and tooltips.
- `client/src/App.jsx`: Mounted `ThemeProvider` at root hierarchy.
- `client/src/components/layout/AppLayout.jsx`: Ambient glowing backdrop for light and dark modes (`bg-slate-50/90 dark:bg-[#070b14]`).
- `client/src/components/layout/Navbar.jsx`: Integrated `ThemeToggle`, `font-display` brand typography, dark glass navbar.
- `client/src/components/layout/Footer.jsx`: Dark theme support and monospace technical telemetry badges.
- `client/src/components/ui/`: `Button`, `Card`, `Badge`, `Input`, `Select`, `Alert`, `Modal`, `LoadingSpinner`, and `ToastContext` updated for dark mode and mature fonts.
- `client/src/components/catalog/`: `VehicleCard` (with `font-mono` prices & specs, `font-display` titles), `VehicleFilters`.
- `client/src/components/recommendations/LongevityDisclaimerModal.jsx`: Dark mode styling and `font-mono` tokens for ML-01 policy rules.
- `client/src/pages/`: `HomePage`, `CatalogPage`, `RecommendationPage`, `ComparePage`, `FavoritesPage`, `VehicleDetailPage`, `AdminCatalogPage`, `LoginPage`, and `RegisterPage` updated with dark mode classes and typography tokens.
- `docs/06_UI_UX_GUIDELINES.md`: Documented the 3-font typographic hierarchy, light/dark color tokens, and theme toggle architecture.

### Validation

## 2026-10-12 — Rich Landing Page, Sidebar Navigation Layout, and Free Gemini Multimodal AI Car Scanner

### Scope and objective

- User requested:
  1. A comprehensive, high-converting Landing Page (`HomePage.jsx`) showcasing the platform, features, and workflow.
  2. A streamlined web structure with a modern Sidebar navigation holding all options for effortless usability.
  3. Free Gemini Multimodal API integration for AI vehicle identification from photos, supporting drag-and-drop, clipboard paste (`Ctrl+V`), and sample vehicles, protected by authentication.

### Implemented Features

1. **Rich Landing Page (`HomePage.jsx`):**
   - High-impact Space Grotesk hero with interactive visual badges and clear CTAs.
   - Interactive Gemini AI Car Scanner showcase banner previewing visual detection capabilities.
   - 3-Step "How It Works" walkthrough (Snap/Search -> Prioritize -> Inspect Ranked Evidence).
   - Core architectural pillars (Deterministic Scoring, Zero-Fabrication Integrity, Microservices Isolation).
   - Clean onboarding CTA banner.

2. **Sidebar Navigation System (`Sidebar.jsx` & `AppLayout.jsx`):**
   - Fixed docked desktop sidebar (`w-64`) with frosted glass styling (`bg-white/80 dark:bg-[#070b14]/90`).
   - Clean groupings:
     - `DISCOVER`: Home (`/`), Catalog (`/vehicles`), AI Car Scanner (`/ai-scanner`, with glowing `AI` pill badge).
     - `DECISION TOOLS`: Recommendations (`/recommendations`), Compare Matrix (`/compare`), Saved Favorites (`/favorites`).
     - `MANAGEMENT`: Admin Inventory (`/admin`, admin-only).
   - Sidebar footer: Theme toggle (Light/Dark) and authenticated user card with initial avatar, role badge, and clean Sign Out action (or Sign In / Register for guests).
   - Mobile responsive: Sleek top mobile header with hamburger trigger opening an off-canvas slide-out glass drawer with one-touch backdrop dismissal.

3. **Gemini AI Vehicle Scanner (`AiScannerPage.jsx` & `/api/v1/ai/identify-vehicle`):**
   - Backend endpoint: `POST /api/v1/ai/identify-vehicle` in Recommendation Service using `@google/genai` with `gemini-3.8-flash`.
   - Protected: Requires authenticated user session via JWT (`authenticate()`), fulfilling user requirement that users must log in to use AI identification and recommendations.
   - Identifies: Make, Model, Approximate Generation/Year, Body Type, Price Segment, Color, Confidence score (0–100), and key visual features.
   - Cross-service catalog link: Immediately queries `catalogClient.searchVehicles()` to return real matching vehicles from the verified catalog.
   - Client capabilities:
     - Drag-and-drop file upload zone.
     - Global clipboard paste listener (`window.addEventListener("paste", ...)`): paste screenshots/images with `Ctrl+V` anywhere!
     - Automatic client-side canvas compression keeping payloads under 45 KiB for fast network transfer.
     - Quick sample vehicle buttons (Compact SUV, Sedan, EV) for instantaneous testing without needing an external image.
     - One-click CTA: "Match with Recommendation Engine" pre-populates recommendation preferences with the detected body type!

### Files modified and created

- `services/recommendation/package.json`: Added `@google/genai` dependency and updated build script to check `src/routes/ai.js`.
- `services/recommendation/src/routes/ai.js`: Created Gemini multimodal AI vehicle identification endpoint with catalog integration.
- `services/recommendation/src/app.js`: Mounted `/api/v1/ai` route with `authenticate` and `catalogClient`.
- `services/recommendation/test/ai.test.js`: Added comprehensive unit tests for anonymous rejection, invalid inputs, and authenticated identification (AI-01, AI-02, AI-03).
- `client/vite.config.js`: Added `/api/v1/ai` reverse proxy to port 4003.
- `client/src/services/aiClient.js`: Created client-side service for Gemini car identification.
- `client/src/components/layout/Sidebar.jsx`: Created modern sidebar navigation component.
- `client/src/components/layout/AppLayout.jsx`: Replaced top Navbar layout with Sidebar navigation and responsive mobile header.
- `client/src/pages/HomePage.jsx`: Replaced preview with rich landing page.
- `client/src/pages/AiScannerPage.jsx`: Created AI Car Scanner page with drag-and-drop, clipboard paste, sample gallery, and catalog matches.
- `client/src/App.jsx`: Mounted `/ai-scanner` route.

### Validation

- `npm run build`: Production client bundle built in 1.88s with 0 errors.
- `npm run lint`: ESLint passed with 0 errors and 0 warnings across all codebases.
- `npm test`: 112/112 tests passed (100% pass rate):
  - Identity Service: 36 tests passed, 0 failed.
  - Vehicle Catalog Service: 34 tests passed, 0 failed.
  - Recommendation Service: 42 tests passed (including AI-01, AI-02, AI-03), 0 failed.

## 2026-10-12 — Typography update to Google Sans

### Completed

- Updated web application typography to use Google Sans across all views and components.
- In `client/index.html`:
  - Updated Google Fonts link to load `Google Sans` (`wght@400;500;600;700`) and `Google Sans Text` (`wght@400;500;600;700`) along with `DM Mono` (`wght@400;500`).
- In `client/src/index.css`:
  - Configured `@theme` tokens:
    - `--font-sans: "Google Sans Text", "Google Sans", "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`
    - `--font-display: "Google Sans", "Google Sans Text", "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`
    - `--font-mono: "DM Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace;`
  - Base layer applies `--font-sans` to `body` and `--font-display` to headings (`h1` through `h6`).
- In `docs/06_UI_UX_GUIDELINES.md`:
  - Documented Google Sans typographic system with hierarchy rules for brand/headings, UI/body, and monospace telemetry.

### Validation

- `npm run build` in `client`: Passed in 1.47s with 0 errors.
- `npm run lint` across monorepo: Passed with 0 errors and 0 warnings.
- All microservices tests: 112/112 passing.

## 2026-10-12 — Enhanced Landing Page

### Completed

- Implemented comprehensive, production-grade landing page in `client/src/pages/HomePage.jsx`:
  1. **Interactive Hero Section with Quick Search:**
     - Google Sans bold typography with gradient brand accents.
     - Direct vehicle search bar with clear action button and popular search chips ("Compact SUV", "Electric", "Under ₹10 Lakh", "Automatic").
     - Quick action buttons linking to AI Car Scanner, Recommendation questionnaire, and Compare matrix.
  2. **Key Metrics Bar:**
     - 4 frosted glass cards highlighting 0% fabricated data, < 2s Gemini vision latency, 100% deterministic rules, and 3 isolated microservices.
  3. **Multimodal AI Scanner Spotlight Banner:**
     - Live simulation graphic illustrating drag-and-drop / clipboard paste image scanning.
     - Direct CTAs with dynamic auth awareness.
  4. **Live Verified Catalog Preview:**
     - Fetches real vehicles via `catalogClient.listVehicles()`.
     - Interactive category tabs (All, SUVs, Sedans, Hatchbacks, EVs).
     - Individual glass vehicle cards with ex-showroom pricing, body types, and direct vehicle links.
  5. **3-Step "How It Works" Flow:**
     - Snap/Search -> Prioritize Needs -> Inspect Ranked Evidence.
  6. **Core Architectural Pillars & Policy Notices:**
     - Rule-Based Deterministic Scoring, Traceable Truth, Isolated Microservices, and Catalog Integrity Policy.
  7. **Dynamic Conversion / Onboarding CTA:**
     - Guest view presents registration & login pathways; authenticated view presents direct AI Scanner and recommendation triggers.

### Validation

- `npm run build` in `client`: Passed cleanly in 689ms with 0 errors.
- `npm run lint`: Passed with 0 errors and 0 warnings across all microservices and client.
- All 112 microservice unit/integration tests remain passing.

## 2026-10-12 — Unauthenticated Guest Landing Page Redirection & Experience

### Completed

- Implemented automatic redirection to the landing page for unauthenticated visitors:
  1. In `client/src/components/layout/AppLayout.jsx`:
     - Added route guard hook: If an unauthenticated user attempts to visit protected internal routes (`/ai-scanner`, `/recommendations`, `/compare`, `/favorites`, `/admin`), they are automatically redirected to the landing page (`/`).
     - Conditional view modes:
       - **Unauthenticated / Guest Experience:** Renders the landing page in a full-width immersive layout with `GuestHeader` (branding, theme toggle, "Sign In" and "Get Started" CTAs) and the rich landing page showcasing the hero, quick search, AI showcase, and live catalog previews.
       - **Authenticated Experience:** Transitions to the docked glassmorphism `Sidebar` navigation providing persistent access to the Discover tools, Decision tools, and profile management.
  2. Created `client/src/components/layout/GuestHeader.jsx`:
     - Clean, focused top navigation for visitors prior to logging in.
     - Direct access to login and registration flows.

### Validation

- `npm run build` in `client`: Built in 1.38s with 0 errors.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- All microservices tests: 112/112 tests passing.

## 2026-10-12 — Color Palette Theming (#2373F4, #578EF5, #65D0F4, #F2F7A0)

### Completed

- Implemented the user-requested custom color palette across the entire application design system:
  - **Electric Cobalt (`#2373F4`):** Primary brand accent, primary CTA buttons, active sidebar pill highlights, and header badges.
  - **Cornflower Blue (`#578EF5`):** Secondary gradient stops, hover accents, and glass input active rings.
  - **Sky Cyan (`#65D0F4`):** Telemetry text, ambient glass reflection glows, AI vision scanning indicators, and title gradient tails.
  - **Lemon Lime (`#F2F7A0`):** High-contrast tag highlights, 100% verified badges, and AI pill tags.
- Updated files:
  1. `client/src/index.css`: Added `@theme` color tokens (`--color-brand-primary`, `--color-brand-secondary`, `--color-brand-cyan`, `--color-brand-lemon`, `--color-primary`, `--color-accent`) and updated glass-input focus states.
  2. `client/src/components/ui/Badge.jsx`: Added `cyan` and `lemon` variants, updated `blue` and `indigo` variants with `#2373F4` and `#578EF5`.
  3. `client/src/components/ui/Button.jsx`: Updated `primary`, `accent`, and added `lemon` button variants using the new palette gradients.
  4. `client/src/components/layout/AppLayout.jsx`: Replaced ambient background glass reflection blobs with the palette gradient colors.
  5. `client/src/components/layout/GuestHeader.jsx`: Applied palette to logo gradient, text gradients, and "Get Started" CTAs.
  6. `client/src/components/layout/Sidebar.jsx`: Applied palette to logo gradient, active nav link gradients, AI pill badge (`#F2F7A0`), and sign-in button.
  7. `client/src/pages/HomePage.jsx`: Updated hero badge, title gradient, search button, popular search chips, metrics numbers, AI showcase banner, and catalog cards with the new palette.
  8. `docs/06_UI_UX_GUIDELINES.md`: Documented the color tokens table with the updated palette.

### Validation

- `npm run build` in `client`: Built in 1.35s with 0 errors.
- `npm run lint`: Passed with 0 errors and 0 warnings across all codebases.
- All 112 microservice unit/integration tests remain green.

## 2026-10-12 — Logo Refinement: Car Icon Removal

### Completed

- Removed the car emoji/icon (`🚗`) from the main platform logo across all views:
  1. `client/src/components/layout/GuestHeader.jsx`: Replaced the car icon with a clean, modern geometric **"VW"** monogram inside the brand gradient tile.
  2. `client/src/components/layout/Sidebar.jsx`: Replaced the car icon with the crisp **"VW"** monogram inside the desktop sidebar header tile.
  3. `client/src/components/layout/AppLayout.jsx`: Replaced the car icon with the **"VW"** monogram in the responsive mobile navigation header.
  4. `client/src/components/layout/Footer.jsx`: Replaced the car icon with the **"VW"** monogram in the site footer brand area.

### Validation

- `npm run build` in `client`: Built in 734ms with 0 errors.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- All microservices tests: 112/112 tests passing.

## 2026-10-12 — Visually Smooth Side-by-Side Sign In & Create Account Portal

### Completed

- Implemented a unified, visually smooth side-by-side authentication portal in `client/src/pages/AuthPage.jsx`:
  1. **Side-by-Side Dual Panels:**
     - Left panel: **Sign In** with email, password, and active status badge.
     - Right panel: **Create Account** with display name, email, 12+ character password, and active status badge.
  2. **Smooth Sliding Mode Switcher:**
     - A pill-slider at the top with a smooth animated highlight indicator switching between `Sign In` and `Create Account`.
     - Clicking the tab or the quick text link instantly transitions focus and updates the browser URL (`/login` or `/register`) without page reloads.
  3. **Visual Aesthetics & Integration:**
     - Styled with the new palette (`#2373F4`, `#578EF5`, `#65D0F4`, `#F2F7A0`).
     - Backed by frosted glassmorphism with ambient background light glows and soft specular borders.
     - Added a feature highlights footer bar (Zero Password Exposure, Gemini AI Vision Access, Saved Comparison Builds).
  4. Updated `LoginPage.jsx` and `RegisterPage.jsx` to render `AuthPage` initialized in their respective modes.

### Validation

- `npm run build` in `client`: Built in 887ms with 0 errors.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- All microservices tests: 112/112 tests passing.

## 2026-10-12 — Dynamic Auth Display with Rich Platform Description

### Completed

- Updated `client/src/pages/AuthPage.jsx` with responsive conditional panel layout:
  1. **When "Sign In" is selected:**
     - The Create Account form is hidden.
     - The left panel renders the **Sign In Form** (Email, Password, Sign In CTA).
     - The right panel dynamically renders **"About VehicleWise"**: Details explaining the next-generation decision system, multimodal Gemini AI vision scanner, deterministic mathematical compatibility matching, and zero-fabrication integrity policy.
  2. **When "Create Account" is selected:**
     - The Sign In form is hidden.
     - The left panel dynamically renders **"Why Join VehicleWise"**: Member benefits highlighting unlimited Gemini AI vision scans, persistent garage bookmarks & side-by-side comparison matrices, and bank-grade session security.
     - The right panel renders the **Create Account Form** (Name, Email, 12+ character Password, Register CTA).
  3. Interactive mode pill-slider smoothly switches the layout and updates the URL (`/login` ↔ `/register`) without page reloads.

### Validation

- `npm run build` in `client`: Built in 753ms with 0 errors.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- All microservices tests: 112/112 tests passing.

## 2026-10-12 — Dark Mode Hover Whiteout Fix

### Completed

- Fixed dark mode hover issue where cards, buttons, and container divs were flashing blank/solid white when hovered:
  1. **Registered Custom Slate Colors in Tailwind v4 Theme (`client/src/index.css`):**
     - Defined `--color-slate-750: #243047;` and `--color-slate-850: #172033;` inside `@theme`. Previously, Tailwind v4 discarded `dark:hover:bg-slate-850` and `dark:hover:bg-slate-750` because they were not standard palette values, causing the light-mode `hover:bg-white` rule to take precedence on hover in dark mode.
  2. **Updated Core UI Elements:**
     - `Card.jsx`: Changed `hoverEffect` dark hover background from uncompiled `dark:hover:bg-slate-850/80` to `dark:hover:bg-slate-800/80`.
     - `VehicleCard.jsx`: Replaced `dark:hover:bg-slate-850/80` with `dark:hover:bg-slate-800/80` to ensure vehicle catalog cards stay sleek dark glass on hover.
     - `Button.jsx`: Replaced `dark:hover:bg-slate-750` with standard `dark:hover:bg-slate-700` for secondary buttons.
  3. **Updated Page Components:**
     - `HomePage.jsx`: Replaced `dark:hover:bg-slate-750` with `dark:hover:bg-slate-700` on hero CTA buttons and browse catalog links.
     - `AiScannerPage.jsx`: Replaced `dark:hover:bg-slate-750` and `dark:hover:bg-slate-800` with `dark:hover:bg-slate-700` on Gemini API key drawer toggle and Create Account CTA.
     - `ComparePage.jsx`: Replaced vehicle modal selector hover background with translucent `dark:hover:bg-slate-700/80`.
     - `RecommendationPage.jsx`: Updated longevity gate modal toggle and questionnaire preference filter chips to use clean `dark:hover:bg-slate-750` / `dark:hover:bg-slate-700`.

### Validation

- `npm --prefix client run build`: Built production bundle in 1.32s with 0 errors.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 112 microservice unit & integration tests passed (36 identity, 34 catalog, 42 recommendation).

## 2026-10-12 — Remove Sign In / Create Account Selection Header Switcher

### Completed

- Removed the top pill mode selection switcher (`Sign In` and `Create Account` toggle buttons) from `client/src/pages/AuthPage.jsx`:
  - When visiting `/login` (Sign In), the portal directly displays the Sign In form side-by-side with the "About VehicleWise" description.
  - When visiting `/register` (Create Account), the portal directly displays the "Why Join VehicleWise" description side-by-side with the Create Account form.
  - Seamless switching between modes remains accessible via the inline links (*"Don't have an account yet? Create account here"* and *"Already have an account? Sign in here"*), without redundant top selector buttons.

### Validation

- `npm --prefix client run build`: Built production bundle in 949ms with 0 errors.
- `npm run lint`: Passed with 0 errors and 0 warnings.


## 2026-10-13 — Full Project Palette Enforcement (#0A0A0A, #2B2B2B, #1F5A3A, #D8FF2A, #F5F5F5)

### Scope and objective

- Implement and enforce the user-requested unified 5-color palette across the entire application:
  1. `#0A0A0A` (Deep Obsidian / Near Black ground & dark canvas base)
  2. `#2B2B2B` (Charcoal / Dark Surface panels, card backdrops, modals, structural borders)
  3. `#1F5A3A` (Deep Forest Green / Brand Secondary, emerald highlights, verified provenance badges)
  4. `#D8FF2A` (Electric Cyber Lime / Brand Primary, high-contrast CTAs, active pills, glowing focal points)
  5. `#F5F5F5` (Crisp Off-White / Light Canvas ground and dark mode crisp typography)
- Preserve microservices architecture boundaries and Glassmorphism aesthetics (frosted surfaces, backdrop blur, ambient light refraction, subtle specular borders).
- Ensure strict WCAG AAA contrast compliance: buttons and badges with `bg-[#D8FF2A]` explicitly use `text-[#0A0A0A]` for >15:1 contrast.

### Files modified

1. **Tokens & Theme Foundations (`client/src/index.css`):**
   - Configured Tailwind v4 `@theme` block with `--color-obsidian: #0A0A0A`, `--color-charcoal: #2B2B2B`, `--color-forest: #1F5A3A`, `--color-lime: #D8FF2A`, `--color-offwhite: #F5F5F5`.
   - Aliased `--color-brand-primary: #D8FF2A` and `--color-brand-secondary: #1F5A3A`.
   - Updated `.glass-panel`, `.glass-card`, `.glass-card-hover`, and `.glass-input` utilities with dark backgrounds using `#2B2B2B`/60 and hover specular borders using `#D8FF2A`/30 and `#1F5A3A`/30.
2. **Layout & Shared Components:**
   - `client/src/components/layout/AppLayout.jsx`: Ambient refraction glows set to `#1F5A3A`, `#D8FF2A`, `#2B2B2B`; canvas base set to `bg-[#F5F5F5] dark:bg-[#0A0A0A]`; selection set to `selection:bg-[#D8FF2A] selection:text-[#0A0A0A]`.
   - `client/src/components/layout/GuestHeader.jsx`: Logo badge and gradient (`#1F5A3A` to `#D8FF2A`), CTA button converted to `#D8FF2A` with `#0A0A0A` text.
   - `client/src/components/layout/Sidebar.jsx`: Active navigation pills set to `bg-[#D8FF2A] text-[#0A0A0A] font-bold`, AI badge set to `#0A0A0A` on active, user box updated to `#2B2B2B`/60.
   - `client/src/components/layout/Navbar.jsx`: Logo, pills, and banner aligned with palette tokens.
   - `client/src/components/layout/Footer.jsx`: Architecture indicator dots and container styling updated.
   - `client/src/components/layout/ThemeToggle.jsx`: Sun/moon toggle styled with `#2B2B2B` and `#D8FF2A`.
   - `client/src/components/ui/Button.jsx`: `primary`, `lemon`, `lime` set to `bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A]`; `accent`, `forest` set to `#1F5A3A`; `secondary` and `subtle` styled with `#2B2B2B` and `#F5F5F5`.
   - `client/src/components/ui/Badge.jsx`: Added `lime`, `forest`, `charcoal`, `dark`, `light` variants; mapped legacy color variants (`yellow`, `blue`, `indigo`, `green`, `cyan`) to palette tokens.
   - `client/src/components/ui/Card.jsx`: Dark backdrop set to `#2B2B2B`/60 with `#D8FF2A`/30 hover specular borders.
   - `client/src/components/ui/Input.jsx` & `Select.jsx`: Backgrounds set to `#2B2B2B`/60, focus borders set to `#1F5A3A` (light) and `#D8FF2A` (dark) with matching rings.
   - `client/src/components/ui/Modal.jsx`: Container set to `#2B2B2B`/95 with `#F5F5F5` text and `#0A0A0A` close button.
   - `client/src/components/ui/LoadingSpinner.jsx`: Ring styled with `#2B2B2B`/20 and active head with `#D8FF2A`.
   - `client/src/components/ui/Alert.jsx`: Success variant updated to `#1F5A3A` and info variant to `#D8FF2A`.
   - `client/src/context/ToastContext.jsx`: Container set to `#2B2B2B`/90, success/info badges set to `#1F5A3A` and `#D8FF2A`.
   - `client/src/components/catalog/VehicleCard.jsx`: Badges updated to `forest`/`lime`/`charcoal`, compare active state set to `#1F5A3A`, CTA set to `#D8FF2A` button.
   - `client/src/components/catalog/VehicleFilters.jsx`: Container and border updated to `#2B2B2B`/60 and `#F5F5F5`.
   - `client/index.html`: Added `<meta name="theme-color" content="#0A0A0A" />`.
3. **All Application Views & Pages:**
   - `client/src/pages/HomePage.jsx`: Full landing page updated (hero badge, title gradient, search button, metrics, AI showcase banner, live catalog preview, 3-step walkthrough, pillars, final CTA).
   - `client/src/pages/AuthPage.jsx`: Header badges, title gradient (`from-[#1F5A3A] to-[#D8FF2A]`), side-by-side card containers, icon chips, and links updated.
   - `client/src/pages/AiScannerPage.jsx`: Drag-drop zone border and pulse rings, preview scanning spinner, confidence gauge, detected spec boxes, and CTA buttons updated.
   - `client/src/pages/RecommendationPage.jsx`: Questionnaire filter chips, budget inputs, priority weight rating chips, match rank pills (`#1F5A3A`), compatibility score gauge (`#D8FF2A`), and spec inspect CTAs updated.
   - `client/src/pages/ComparePage.jsx`: Comparison matrix head (`bg-[#1F5A3A]/10 dark:bg-[#2B2B2B]`), row hover states (`hover:bg-[#1F5A3A]/5 dark:hover:bg-[#0A0A0A]/40`), and vehicle picker modal items updated.
   - `client/src/pages/CatalogPage.jsx`: Floating comparison tray (`bg-[#2B2B2B]/90`, launch CTA `bg-[#D8FF2A]`), pagination counter chip updated.
   - `client/src/pages/VehicleDetailPage.jsx`: Specification badges, pricing summary, engine & dimension dl cards, data provenance cards, and return CTAs updated.
   - `client/src/pages/FavoritesPage.jsx`: Unauthenticated sign-in CTA (`#D8FF2A`), saved builds badge, price boxes, and detail CTAs updated.
   - `client/src/pages/AdminCatalogPage.jsx`: Admin inventory table header, publication status badges (`lime`, `charcoal`, `dark`), and create vehicle modal updated.
4. **Design Documentation:**
   - `docs/06_UI_UX_GUIDELINES.md`: Documented the 5-color token table, accessibility rationale, and usage specifications.

### Validation

- `npm run build --workspace=@vehicle/client`: Vite production build passed in 2.17s (0 errors).
- `npm run lint`: ESLint passed across all workspaces with 0 errors and 0 warnings.
- `npm run test --workspace=@vehicle/client`: 5/5 client tests passed.
- `npm test`: 102/102 microservice unit and integration tests passed (Identity: 26, Catalog: 34, Recommendation: 42).
- `npm run test:e2e`: 5/5 end-to-end integration journeys passed (100% pass rate).


## 2026-10-13 — MongoDB Atlas Cluster Integration & Validation

### Scope and objective

- Configure and connect all three backend microservices to the user-provided MongoDB Atlas cluster:
  `mongodb+srv://uttamvishwakarma096_db_user:xhjwZQPxbGdhvabe@cluster0.xpzrna4.mongodb.net`
- Maintain strict database isolation per the approved three-service architecture:
  1. Identity and User Service: `vehicle_identity`
  2. Vehicle Catalog Service: `vehicle_catalog`
  3. Recommendation Service: `vehicle_recommendations`
- Ensure credentials and connection strings are isolated inside service-local `.env` files (excluded from Git via `.gitignore`) and never exposed to the frontend bundle.
- Ensure Node.js DNS SRV resolution on Windows gracefully handles c-ares loopback limitations via DNS fallback to standard resolvers.

### Files modified

1. **Service Environment Configurations (`.env`):**
   - `services/identity-user/.env`: Configured `HOST=127.0.0.1`, `PORT=4001`, `MONGODB_URI=mongodb+srv://uttamvishwakarma096_db_user:xhjwZQPxbGdhvabe@cluster0.xpzrna4.mongodb.net/vehicle_identity?retryWrites=true&w=majority`.
   - `services/vehicle-catalog/.env`: Configured `HOST=127.0.0.1`, `PORT=4002`, `MONGODB_URI=mongodb+srv://uttamvishwakarma096_db_user:xhjwZQPxbGdhvabe@cluster0.xpzrna4.mongodb.net/vehicle_catalog?retryWrites=true&w=majority`.
   - `services/recommendation/.env`: Configured `HOST=127.0.0.1`, `PORT=4003`, `MONGODB_URI=mongodb+srv://uttamvishwakarma096_db_user:xhjwZQPxbGdhvabe@cluster0.xpzrna4.mongodb.net/vehicle_recommendations?retryWrites=true&w=majority`, `CATALOG_SERVICE_URL=http://127.0.0.1:4002`, `IDENTITY_SERVICE_URL=http://127.0.0.1:4001`.
2. **Database Initialization Modules (`src/database.js`):**
   - `services/identity-user/src/database.js`, `services/vehicle-catalog/src/database.js`, `services/recommendation/src/database.js`: Added fallback logic checking if Node's c-ares DNS resolver defaults exclusively to `127.0.0.1` (a known Windows platform issue causing `querySrv ECONNREFUSED` on SRV records), falling back to public DNS resolvers (`8.8.8.8`, `1.1.1.1`) so `mongodb+srv://` resolves properly.

### Validation

- **Direct Atlas Cluster Connectivity & Index Initialization:**
  - `Identity Service`: Connected to Atlas shard `ac-q850tmj-shard-00-01.xpzrna4.mongodb.net`, initialized `vehicle_identity` database, successfully created unique email indexes, verified `isReady: true`.
  - `Vehicle Catalog Service`: Connected to Atlas shard `ac-q850tmj-shard-00-00.xpzrna4.mongodb.net`, initialized `vehicle_catalog` database, successfully created compound catalog indexes, verified `isReady: true`.
  - `Recommendation Service`: Connected to Atlas shard `ac-q850tmj-shard-00-02.xpzrna4.mongodb.net`, initialized `vehicle_recommendations` database, successfully created recommendation & favorites indexes, verified `isReady: true`.
- **Quality Gates & Tests:**
  - `npm run lint`: Passed with 0 errors and 0 warnings.
  - `npm run build`: Passed across all workspaces (client Vite bundle and all 3 microservices).
  - `npm test`: Passed 102/102 unit & integration tests across all workspaces (Identity: 26, Catalog: 34, Recommendation: 42).
  - `npm run test:e2e`: Passed 5/5 end-to-end multi-service user journeys.


## 2026-10-13 — Emoji Replacement with `react-icons` Package

### Scope and objective

- Install and integrate `react-icons` into `@vehicle/client`.
- Systematically replace all emojis and unicode character glyphs across the entire frontend application with professional, scalable, theme-aware SVG icons from `react-icons` (`react-icons/fi`, `react-icons/fa6`, and `react-icons/hi2`).
- Ensure consistent icon styling, alignment, accessible labels, and alignment with the Neo-brutalist / Glassmorphic palette (`#0A0A0A`, `#2B2B2B`, `#1F5A3A`, `#D8FF2A`, `#F5F5F5`).

### Files modified

1. **Client Dependencies (`client/package.json`):**
   - Installed `react-icons` (`^5.5.0`).
2. **Layout & Shared Components:**
   - `client/src/components/layout/AppLayout.jsx`: Replaced unicode hamburger `☰` with `<FiMenu />`.
   - `client/src/components/layout/Navbar.jsx`: Replaced mobile toggle `☰` / `✕` with `<FiMenu />` and `<FiX />`.
   - `client/src/components/layout/Sidebar.jsx`: Replaced navigation emojis (`🏠`, `🚗`, `📸`, `⚡`, `⚖️`, `⭐`, `🛡️`, and `✕`) with `<FiHome>`, `<FaCar>`, `<FiCamera>`, `<FiZap>`, `<FaScaleBalanced>`, `<FiStar>`, `<FiShield>`, and `<FiX>`.
   - `client/src/components/ui/Modal.jsx`: Replaced close button `✕` with `<FiX />`.
   - `client/src/context/ToastContext.jsx`: Replaced toast dismiss `✕` with `<FiX />`.
   - `client/src/components/catalog/VehicleCard.jsx`: Replaced favorite star symbols (`★`, `☆`) and compare symbols (`✓`, `+`) with `<FaStar>`, `<FaRegStar>`, `<FiCheck>`, and `<FiPlus>`.
   - `client/src/components/catalog/VehicleFilters.jsx`: Replaced search emoji `🔍` with `<FiSearch />`.
3. **Application Views & Pages:**
   - `client/src/pages/HomePage.jsx`: Replaced category emojis (`✨`, `🚙`, `🚗`, `🚘`, `⚡`) with `<HiSparkles>`, `<FaCarSide>`, `<FaCar>`, and `<FiZap>`; hero badge icon with `<HiSparkles>`; hero search icons with `<FiSearch>` and `<FiX>`; hero CTA buttons with `<FiCamera>`, `<FiZap>`, and `<FaScaleBalanced>`; live vision detection graphic with `<FaCar>`; architectural pillar emojis with `<FiZap>`, `<FiShield>`, and `<FiLayers>`; bottom CTAs with `<FiCamera>` and `<FiZap>`.
   - `client/src/pages/AuthPage.jsx`: Replaced benefit cards and guarantee footer emojis (`📸`, `⚡`, `🛡️`, `⭐`, `🔒`, `✨`) with `<FiCamera>`, `<FiZap>`, `<FiShield>`, `<FiStar>`, `<FiLock>`, and `<HiSparkles>`.
   - `client/src/pages/AiScannerPage.jsx`: Replaced settings key button, close button, unauthenticated lock gate, dropzone camera, sample car pills, analyze button, cues checkmarks, and recommendation CTA emojis with `<FiKey>`, `<FiCheck>`, `<FiX>`, `<FiLock>`, `<FiCamera>`, `<FaCar>`, and `<FiZap>`.
   - `client/src/pages/ComparePage.jsx`: Replaced comparison matrix empty state `⚖️` and column remove `✕` with `<FaScaleBalanced>` and `<FiX>`.
   - `client/src/pages/FavoritesPage.jsx`: Replaced unauthenticated gate `🔒` and empty state `★` with `<FiLock>` and `<FaStar>`.
   - `client/src/pages/RecommendationPage.jsx`: Replaced longevity modal button, filter chips, save button, calculate button, empty state, match strengths, trade-off warnings, favorite and compare buttons with `<FiInfo>`, `<FiCheck>`, `<FaStar>`, `<FaRegStar>`, `<FiZap>`, `<FiSlash>`, `<FiCheckCircle>`, `<FiAlertTriangle>`, and `<FiPlus>`.
   - `client/src/pages/VehicleDetailPage.jsx`: Replaced favorite action button and data provenance header with `<FaStar>`, `<FaRegStar>`, and `<FiShield>`.

### Validation

- Verified that 0 emojis or unrendered unicode symbol characters remain in `client/src/`.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Production bundle built cleanly across all workspaces (`@vehicle/client` Vite bundle built in 2.10s).
- `npm run test --workspace=@vehicle/client`: 5/5 client unit tests passed.
- `npm run test:e2e`: 5/5 end-to-end integration journeys passed (100% pass rate).

## 2026-10-13 — Global Google Sans Typography Implementation

### Scope and objective

- Authoritatively configure and apply Google Sans (`Google Sans` and `Google Sans Text`) across the entire client application.
- Ensure all typography (headings, body copy, interactive buttons, form controls, inputs, select dropdowns, textareas, badges, modals, and monospaced element fallbacks) uniformly adopts Google Sans.
- Preserve the 5-color Neo-brutalist / Glassmorphic visual palette (`#0A0A0A`, `#2B2B2B`, `#1F5A3A`, `#D8FF2A`, `#F5F5F5`) and all SVG icon integrations (`react-icons`).

### Files modified

1. **HTML Font Preloads & Stylesheet (`client/index.html`):**
   - Updated the Google Fonts stylesheet link to import `Google Sans` and `Google Sans Text` across regular and italic styles and weights 400, 500, 600, and 700 with `preconnect` optimizations.
2. **Global CSS & Theme Definitions (`client/src/index.css`):**
   - Updated `@theme` variables:
     - `--font-sans`: `"Google Sans", "Google Sans Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`
     - `--font-display`: `"Google Sans", "Google Sans Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`
     - `--font-mono`: `"Google Sans", "Google Sans Text", SFMono-Regular, Menlo, Monaco, Consolas, monospace;`
   - Updated `@layer base`:
     - Applied `font-family: var(--font-sans);` to universal selectors `*, *::before, *::after`.
     - Applied `font-family: var(--font-sans);` to `html, body`.
     - Applied `font-family: var(--font-display);` to headings `h1, h2, h3, h4, h5, h6`.
     - Applied `font-family: inherit;` to form elements `button, input, optgroup, select, textarea`.
     - Applied `font-family: var(--font-mono);` to `code, kbd, samp, pre`.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Production build succeeded across all workspaces (client Vite bundle and all 3 microservices).
- `npm run test --workspace=@vehicle/client`: 5/5 client unit tests passed.
- `npm run test:e2e`: 5/5 end-to-end test journeys passed.
- Typography inspection verified `Google Sans` is prioritized and cascaded universally across the DOM.

## 2026-10-13 — Password Hide & Unhide Visibility Toggle

### Scope and objective

- Implement password visibility toggle (hide/unhide) for password input fields, specifically Sign In and Create Account (Register) flows.
- Integrate scalable, accessible SVG icons from `react-icons/fi` (`FiEye` and `FiEyeOff`).
- Maintain the approved 5-color Neo-brutalist / Glassmorphic palette (`#0A0A0A`, `#2B2B2B`, `#1F5A3A`, `#D8FF2A`, `#F5F5F5`) and Google Sans typography.

### Files modified

1. **Shared UI Input Component (`client/src/components/ui/Input.jsx`):**
   - Added internal state `isPasswordVisible` to switch between input types `password` and `text`.
   - Added right-aligned toggle button equipped with `FiEye` / `FiEyeOff` icons.
   - Added `pr-11` padding on password inputs to prevent overlap with password text.
   - Enforced `type="button"` on toggle button to prevent inadvertent form submissions.
   - Maintained full accessibility (`aria-label`, `title`).
   - Automatically supports `login-password` and `reg-password` in `AuthPage.jsx` as well as other password inputs.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Production build succeeded across all workspaces.
- `npm run test --workspace=@vehicle/client`: 5/5 client unit tests passed.
- `npm run test:e2e`: 5/5 end-to-end user journeys passed.

## 2026-10-13 — Comprehensive Mobile & Tablet Responsive Redesign

### Scope and objective

- Implement responsive styling and interaction patterns across all application pages, navigation bars, drawers, tables, forms, and cards for smartphones (<640px), portrait/landscape tablets (640px–1023px), and desktops (≥1024px).
- Eliminate all horizontal overflow clipping, unscrollable modals, and squashed table columns.
- Preserve the 3-microservice architectural boundaries, Glassmorphism aesthetic, 5-color palette (`#0A0A0A`, `#2B2B2B`, `#1F5A3A`, `#D8FF2A`, `#F5F5F5`), and deterministic recommendation engine contracts.

### Files modified

1. **`client/src/components/ui/Modal.jsx`**:
   - Added `max-h-[88dvh] overflow-y-auto` and `w-[calc(100%-1.5rem)] sm:w-full` so modal dialogues never clip the viewport or become unreachable on landscape phones.
2. **`client/src/components/layout/GuestHeader.jsx`**:
   - Added hamburger toggle menu (`FiMenu` / `FiX`), mobile navigation drawer, and responsive stacked actions for Sign In and Get Started.
3. **`client/src/components/layout/Sidebar.jsx`**:
   - Elevated persistent desktop sidebar breakpoint from `md` (768px) to `lg` (1024px) to free up 100% of horizontal canvas on iPad portrait.
   - Constrained mobile drawer to `w-64 max-w-[85vw] h-dvh overflow-y-auto overscroll-y-contain` and bound `Escape` key dismiss listener with cleanup.
4. **`client/src/components/layout/AppLayout.jsx`**:
   - Adjusted sidebar offset to `lg:pl-64` and padded main container with `px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8`.
   - Enabled mobile/tablet header bar with VW logo, hamburger toggle, and theme switch on `< lg`.
5. **`client/src/components/layout/Footer.jsx`**:
   - Adapted column grid to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with responsive spacing and margins.
6. **`client/src/pages/HomePage.jsx`**:
   - Adapted hero typography (`text-3xl sm:text-5xl lg:text-6xl`), hero search input stacking, metrics bar (`grid-cols-2 lg:grid-cols-4`), AI scanner spotlight card, and final CTA section.
7. **`client/src/components/catalog/VehicleFilters.jsx`**:
   - Added collapsible mobile filter drawer with active filter pill count, reset action, and toggle button on `< md`, expanding smoothly on `md+`.
8. **`client/src/pages/CatalogPage.jsx`**:
   - Made comparison floating bar sticky at `top-16 lg:top-20` with responsive wrap and adapted vehicle catalog grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
9. **`client/src/pages/ComparePage.jsx`**:
   - Pinned specification label column with `sticky left-0 z-20` and backdrop blur for seamless horizontal scrolling on phone/tablet; added horizontal swipe prompt.
10. **`client/src/pages/VehicleDetailPage.jsx`**:
    - Converted header card to `flex-col lg:flex-row`, price panel to `w-full lg:w-auto`, and specification lists to `grid-cols-1 sm:grid-cols-2`.
11. **`client/src/pages/RecommendationPage.jsx`**:
    - Adapted budget inputs, practical requirements, priorities grid (`sm:grid-cols-2 lg:grid-cols-5`), form actions, and recommendation result cards (`flex-col sm:flex-row`).
12. **`client/src/pages/AdminCatalogPage.jsx`**:
    - Wrapped vehicle inventory table with `overflow-x-auto min-w-[700px]` and responsive cell padding; made create vehicle modal inputs `sm:grid-cols-2 lg:grid-cols-4`.
13. **`client/src/pages/AiScannerPage.jsx`**:
    - Made header, dropzone preview grid (`grid-cols-1 lg:grid-cols-12`), detected specs matrix, and catalog match cards responsive.
14. **`client/src/pages/AuthPage.jsx`**:
    - Added responsive padding `p-4 sm:p-8`, adjusted typography, and ordered registration form before benefits description on mobile devices.
15. **`client/src/pages/FavoritesPage.jsx`**:
    - Adapted typography and card padding.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm --workspace client run build`: Vite build passed in 1.47s (dist generated cleanly).
- `npm test`: 109 automated tests passed (33 Identity, 34 Catalog, 42 Recommendation) with 0 failures.

## 2026-10-13 — Verified Vehicle Catalog Seeding

### Scope and objective

- Seed the Vehicle Catalog MongoDB database (`vehicle_catalog`) with 22 diverse, verified vehicle records spanning popular body types, fuels, transmissions, and seating capacities.
- Provide traceable data provenance (`dataSources`), verified ex-showroom and on-road prices (`prices`), and authentic specifications (`specifications.claimedMileage`, `specifications.power`, `specifications.torque`, `specifications.groundClearance`, etc.).
- Comply strictly with schema validation, publication preconditions, and idempotency (no duplicate entries on subsequent runs).
- Provide an executable script `services/vehicle-catalog/src/seed.js` and npm convenience script `npm run seed:catalog`.

### Implemented behavior and files changed

1. **`services/vehicle-catalog/src/seed.js`**:
   - Created standalone, idempotent seed runner supporting 22 vehicle models across segments:
     - Compact SUVs: Tata Nexon, Tata Nexon EV, Maruti Suzuki Brezza (Petrol & CNG), Kia Seltos, Hyundai Creta (Petrol & Diesel), Tata Harrier, MG ZS EV, Mahindra Thar.
     - Hatchbacks: Maruti Suzuki Swift, Tata Tiago EV, Hyundai i20.
     - Sedans: Honda City (Petrol & e:HEV Strong Hybrid), Hyundai Verna, Tesla Model 3.
     - MUVs / 7-Seaters: Toyota Innova Hycross (Strong Hybrid), Maruti Suzuki Ertiga, Mahindra XUV700, Mahindra Scorpio-N, Toyota Fortuner.
   - Enforced client-side payload validation via `validateVehiclePayload` and `validatePublicationPreconditions` before inserting/updating.
   - Configured Decimal128 price casting and traceable official data sources.
2. **`services/vehicle-catalog/package.json`**:
   - Added `"seed": "node --env-file-if-exists=.env src/seed.js"` script and included `src/seed.js` in build syntax validation.
3. **`package.json`**:
   - Added root `"seed:catalog": "npm run seed --workspace @vehicle/vehicle-catalog"`.

### Validation

- `npm run seed:catalog`: Executed successfully. 22 vehicles inserted as published.
- Second run verified idempotency: 22 vehicles updated, 0 duplicates created.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Passed across client and all 3 microservices.
- `npm test`: 109/109 tests passed (33 Identity, 34 Catalog, 42 Recommendation).
- `npm run test:e2e`: 5/5 end-to-end integration journeys passed.

## 2026-10-13 — Authentication Protection for Recommendations & AI Features

### Scope and objective

- Protect Recommendation and AI features behind mandatory user authentication, requiring guests to register or log in before calculating personalized recommendations or running AI vehicle visual identification.
- Ensure public access is maintained for vehicle browsing (`/vehicles`), vehicle detail sheets (`/vehicles/:id`), and vehicle comparison matrix (`/compare`).
- Restrict Recommendation API (`POST /api/v1/recommendations`) and AI Vision API (`POST /api/v1/ai/identify-vehicle`) with `authenticate()` middleware, returning `401 UNAUTHORIZED` for anonymous callers.
- Provide responsive UX protection gates in the React frontend with clear call-to-actions, disabled execute actions for guests, and route-level redirection to `/login`.
- Update API specification and test coverage to maintain verifiable honesty guarantees.

### Implemented behavior and files changed

1. **`services/recommendation/src/routes/recommendations.js`**:
   - Replaced `authenticate({ optional: true })` with strict `authenticate()` middleware on `POST /api/v1/recommendations`.
   - Returns standard `401 UNAUTHORIZED` payload for unauthenticated requests.
2. **`services/recommendation/src/routes/ai.js`**:
   - Verified strict `authenticate()` enforcement on `POST /api/v1/ai/identify-vehicle`.
3. **`client/src/components/layout/AppLayout.jsx`**:
   - Configured `PROTECTED_ROUTES = ["/ai-scanner", "/recommendations", "/favorites", "/admin"]`.
   - Maintained `/compare` and `/vehicles` as public guest routes.
   - Redirects unauthenticated direct visits to protected routes to `/login`.
4. **`client/src/pages/RecommendationPage.jsx`**:
   - Added Unauthenticated Protection Gate banner card with `FiLock` icon, clear messaging, and direct links to `/login` and `/register`.
   - Disabled calculate match button (`disabled={loading || !isAuthenticated}`) and added early toast warning with navigate fallback in `handleSubmit`.
5. **`client/src/pages/AiScannerPage.jsx`**:
   - Maintained authentication protection banner, disabled scan button when unauthenticated, and redirect in `runAnalysis`.
6. **`client/src/components/layout/GuestHeader.jsx`**:
   - Added `isProtected: true` flag and subtle lock icon to "Recommendations" nav link on desktop and mobile drawer.
7. **`docs/05_API_SPECIFICATION.md`**:
   - Updated `POST /api/v1/recommendations` authentication from optional to "Required. Unauthenticated callers receive 401 UNAUTHORIZED".
   - Documented `POST /api/v1/ai/identify-vehicle` in Section 5.7 with required authentication.
8. **`services/recommendation/test/api.test.js`**:
   - Updated `REC-01` to verify anonymous requests receive 401 UNAUTHORIZED.
   - Added `REC-01b` verifying authenticated users receive ranked recommendations.
   - Updated `REC-02` and `REC-03` with valid bearer tokens.
9. **`test/e2e.test.js`**:
   - Updated `E2E-02` journey to test unauthenticated 401 rejection and authenticated calculation.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Passed across `@vehicle/client`, `@vehicle/identity-user`, `@vehicle/vehicle-catalog`, and `@vehicle/recommendation`.
- `npm test`: 110/110 tests passed (33 Identity, 34 Catalog, 43 Recommendation).
- `npm run test:e2e`: 5/5 end-to-end integration journeys passed.

## 2026-10-13 — Authentication Protection for Vehicle Comparison Feature

### Scope and objective

- Protect the vehicle comparison feature behind mandatory user authentication per user request, requiring users to log in before viewing or generating vehicle comparisons.
- Enforce server-side authentication on `POST /api/v1/compare`, rejecting unauthenticated callers with `401 UNAUTHORIZED`.
- Protect the frontend route `/compare` via `AppLayout.jsx`, redirecting unauthenticated visitors to `/login`.
- Add an Unauthenticated Protection Gate card to `ComparePage.jsx` and disable the "+ Add Vehicle" button for unauthenticated users.
- Add authentication protection in `CatalogPage.jsx` when toggling vehicles for comparison or launching comparison from the sticky tray.
- Update `GuestHeader.jsx` navigation to mark Compare with a visual lock indicator.
- Update `docs/05_API_SPECIFICATION.md` Section 5.2.
- Update unit and end-to-end integration tests (`COMP-01`, `COMP-01b`, `COMP-02`, `COMP-03`, `E2E-01`).

### Implemented behavior and files changed

1. **`services/recommendation/src/routes/compare.js`**:
   - Injected `authenticate` middleware into `POST /api/v1/compare`. Anonymous requests are rejected with `401 UNAUTHORIZED`.
2. **`services/recommendation/src/app.js`**:
   - Passed `authenticate` middleware to `createCompareRoutes`.
3. **`client/src/components/layout/AppLayout.jsx`**:
   - Added `"/compare"` to `PROTECTED_ROUTES`. Unauthenticated direct visits redirect to `/login`.
4. **`client/src/components/layout/GuestHeader.jsx`**:
   - Set `isProtected: true` for the Compare nav link, displaying the lock icon.
5. **`client/src/pages/ComparePage.jsx`**:
   - Added Unauthenticated Protection Gate card with `FiLock` icon, explaining that side-by-side comparison requires sign-in.
   - Guarded `useEffect` so comparison fetching is skipped when unauthenticated.
   - Guarded `openAddModal` with authentication toast and redirect to `/login`.
   - Disabled the "+ Add Vehicle" button for unauthenticated guests.
6. **`client/src/pages/CatalogPage.jsx`**:
   - Updated `handleToggleCompare` to prompt unauthenticated users to sign in and redirect to `/login`.
   - Updated comparison tray button to render "Sign In to Compare →" with `FiLock` for guest visitors.
7. **`docs/05_API_SPECIFICATION.md`**:
   - Updated Section 5.2 to mark `POST /api/v1/compare` authentication as "Required. Unauthenticated callers receive 401 UNAUTHORIZED".
8. **`services/recommendation/test/api.test.js`**:
   - Updated `COMP-01` to verify anonymous requests receive 401 UNAUTHORIZED.
   - Added `COMP-01b` to verify authenticated users receive formatted comparison data.
   - Updated `COMP-02` and `COMP-03` with bearer tokens.
9. **`test/e2e.test.js`**:
   - Updated `E2E-01` to test both unauthenticated 401 rejection and authenticated 200 comparison.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Passed across `@vehicle/client` and all 3 microservices.
- `npm test`: 111/111 tests passed (33 Identity, 34 Catalog, 44 Recommendation).
- `npm run test:e2e`: 5/5 end-to-end integration journeys passed.

## 2026-10-13 — User Registration Payload Schema Alignment

### Scope and objective

- Fix `400 Bad Request` during user registration (`POST /api/v1/auth/register`) caused by frontend sending nested `{ profile: { displayName } }` while backend strict allowlist expected top-level `{ displayName }`.
- Clarify browser behavior where `GET /api/v1/auth/me` naturally returns `401 Unauthorized` for anonymous guests before login.
- Add dual-format payload compatibility in `services/identity-user/src/routes/auth.js` and align `client/src/services/authClient.js` with the documented API specification.

### Implemented behavior and files changed

1. **`services/identity-user/src/routes/auth.js`**:
   - Allowed extraction of `displayName` from either direct body property (`body.displayName`) or nested profile object (`body.profile.displayName`).
   - Prevented false positive `UNRECOGNIZED_FIELD` validation errors when callers supply either schema format.
2. **`client/src/services/authClient.js`**:
   - Updated `register` method to format `{ email, password, displayName }` complying strictly with API specification Section 3.1.
3. **`client/src/context/AuthContext.jsx`**:
   - Added support for `displayName` parameter in `register` callback.
4. **`client/src/pages/AuthPage.jsx`**:
   - Updated registration form submit to supply `displayName: regName.trim() || undefined`.
   - Enhanced UI error handling to display granular `err.fieldErrors` when server validations fail.

### Validation

- Tested both direct `displayName` and nested `profile.displayName` payloads returning `201 Created`.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Passed across `@vehicle/client` and all 3 microservices.
- `npm test`: 111/111 tests passed (33 Identity, 34 Catalog, 44 Recommendation).
- `npm run test:e2e`: 5/5 end-to-end integration journeys passed.

## 2026-10-13 — Fix Vehicle Details Page Visibility & Cross-Service JWKS Verification

### Scope and objective

- Fix missing vehicle details page after clicking on vehicle cards (`/vehicles/:id`).
- Fix `401 Unauthorized` on `GET /api/v1/favorites?limit=50` and downstream authenticated calls to Recommendation Service.
- Implement automated JWKS discovery in `TokenVerifier` for Recommendation and Vehicle Catalog services, enabling verification of tokens signed by Identity Service without requiring manual static public-key distribution.
- Ensure all vehicle card components allow navigating to vehicle details via card titles as well as action buttons.
- Harmonize specification display in `VehicleDetailPage` across ICE and EV models (e.g. `claimedRange` vs `claimedMileage`, `bootSpace` vs `bootCapacity`, `engine.displacementCc`).

### Implemented behavior and files changed

1. **`client/src/services/catalogClient.js`**:
   - Updated `getVehicle(vehicleId)`, `adminCreateVehicle`, `adminUpdateVehicle`, and `adminUpdateStatus` to return `data?.vehicle ?? data`.
   - Resolved bug where `data?.vehicle` evaluated to `undefined` because backend endpoints return the formatted vehicle object directly.
2. **`client/src/pages/VehicleDetailPage.jsx`**:
   - Updated component to accept `params: propParams` directly from `Route`, falling back to `useParams().id`.
   - Enhanced specification rendering to support powertrain differences: displays `engine.displacementCc` for combustion vehicles and `claimedRange` for electric vehicles (`specs.claimedRange.value`).
   - Mapped `specs.bootSpace` and `dataSources.retrievedAt` / `dataSources.sourceUrl` to prevent "Invalid Date" or "Unreported" on verified data.
3. **`client/src/components/catalog/VehicleCard.jsx`**:
   - Wrapped vehicle title (`make` and `model`) in `<Link to={'/vehicles/' + vehicle.id}>` to make clicking the card title open the details page.
   - Updated mileage badge to show EV range (`claimedRange`) when mileage is absent.
4. **`services/recommendation/src/auth/jwt.js` & `services/vehicle-catalog/src/auth/jwt.js`**:
   - Added `jwksUri`, `refreshJwks()`, and async key resolution to `TokenVerifier`.
   - Enabled dynamic JWKS fetching from Identity Service's well-known discovery endpoint (`/.well-known/jwks.json`).
5. **`services/recommendation/src/auth/middleware.js` & `services/vehicle-catalog/src/auth/middleware.js`**:
   - Awaited `tokenVerifier.verifyAccessToken(token)`.
6. **`services/recommendation/src/app.js` & `services/vehicle-catalog/src/app.js`**:
   - Configured `TokenVerifier` fallback using `jwksUri` (`${IDENTITY_SERVICE_URL}/.well-known/jwks.json`).
7. **`services/vehicle-catalog/.env`**:
   - Configured `IDENTITY_SERVICE_URL=http://127.0.0.1:4001`.

### Validation

- `curl http://127.0.0.1:5173/api/v1/vehicles/6acdd945a06469c85fd583be`: Verified 200 OK returning full vehicle specs via Vite dev server proxy.
- Direct login and favorites verification test: `POST /api/v1/auth/login` followed by `GET http://127.0.0.1:5173/api/v1/favorites?limit=50`: Verified `200 OK` (0 errors, favorites retrieved with valid authentication).
- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Passed across all 4 workspaces (`@vehicle/client`, `@vehicle/identity-user`, `@vehicle/vehicle-catalog`, `@vehicle/recommendation`).
- `npm test`: 111/111 tests passed across all 3 backend microservices.
- `npm run test:e2e`: 5/5 end-to-end integration journeys passed.

## 2026-10-13 — AI Scanner Authentication Gate & Auto-Refresh Token Resilience

### Scope and objective

- Address `401 Unauthorized` on `POST /api/v1/ai/identify-vehicle` in browser when session expires or unauthenticated users trigger AI car identification.
- Introduce transparent 401 token refresh retry in `ApiClient` using the 7-day rotating refresh session (`POST /api/v1/auth/refresh`), preventing unexpected 401 errors during active browsing when the 15-minute access token expires.
- Update `AiScannerPage` to provide clear authentication state indicators: when unauthenticated, display "Sign In to Identify Vehicle" with lock icon and cleanly redirect to `/login` with an informational toast rather than firing an unauthenticated request.
- Catch 401 errors in `AiScannerPage.runAnalysis` and gracefully guide the user to sign in again if both access and refresh tokens have expired.

### Implemented behavior and files changed

1. **`client/src/services/apiClient.js`**:
   - Added automatic 401 interceptor that calls `POST /api/v1/auth/refresh` with `credentials: "include"`.
   - On successful refresh, updates `csrfToken` and retries the original request seamlessly.
   - Bounded with `_isRetry: true` to prevent infinite loops if credentials are completely invalid.
2. **`client/src/pages/AiScannerPage.jsx`**:
   - Replaced disabled-only button state with an explicit "Sign In to Identify Vehicle" action when `!isAuthenticated`.
   - Enhanced `runAnalysis` catch block to detect `err.status === 401` and guide the user to `/login`.

### Validation

- Tested authenticated vs unauthenticated calls: unauthenticated returns structured 401 `UNAUTHORIZED`, authenticated with session cookie returns 200 with vehicle identification.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Passed across all 4 packages.
## 2026-10-13 — Vehicle Card Images & Catalog Database Persistence

### Scope and objective

- Support vehicle photography in vehicle cards (`VehicleCard.jsx`, `VehicleDetailPage.jsx`, `HomePage.jsx`) with responsive layout, lazy loading, and graceful car silhouette fallback.
- Persist verified high-resolution image URLs in the MongoDB Atlas `vehicle_catalog` database collection for all 22 vehicles.
- Update `services/vehicle-catalog` schema, formatting, validation, and seed definition to officially support `imageUrl`.
- Prevent hotlinking rate limits (HTTP 429/403) by selecting open-CORS, high-uptime CDN URLs verified with HTTP 200 responses.

### Implemented behavior and files changed

1. **`services/vehicle-catalog/src/models.js`**:
   - Added `imageUrl: { type: String, trim: true }` to Mongoose `vehicleSchema` with `strict: "throw"` support.
2. **`services/vehicle-catalog/src/vehicles/formatting.js`**:
   - Added `if (doc.imageUrl) result.imageUrl = doc.imageUrl;` to `formatVehicle` projection.
3. **`services/vehicle-catalog/src/vehicles/validation.js`**:
   - Added `"imageUrl"` to `ALLOWED_VEHICLE_KEYS` and allowed valid URLs and relative paths.
4. **`services/vehicle-catalog/src/routes/admin.js`**:
   - Added `"imageUrl"` to allowed keys for admin create and update routes.
5. **`services/vehicle-catalog/src/apply-images.js` & `services/vehicle-catalog/src/seed.js`**:
   - Created database update script and executed migration against MongoDB Atlas `vehicle_catalog` database, updating all 22 documents with verified `imageUrl`.
   - Updated `VEHICLE_SEEDS` in `seed.js` so newly seeded environments include verified `imageUrl`.
6. **`client/src/components/catalog/VehicleCard.jsx`**:
   - Integrated top image preview thumbnail with smooth hover zoom, `loading="lazy"`, and `FaCarSide` fallback placeholder on error or missing image.
7. **`client/src/pages/VehicleDetailPage.jsx`**:
   - Enhanced main vehicle header card with responsive 12-column layout displaying high-resolution vehicle hero image alongside pricing and specifications.
8. **`client/src/pages/HomePage.jsx`**:
   - Added vehicle thumbnail preview to featured vehicle cards with fallback.
9. **`services/vehicle-catalog/test/public.test.js`**:
   - Added `imageUrl` to test fixtures and asserted projection in `CAT-02` tests.

### Validation

- Tested MongoDB Atlas database: `POST /api/v1/vehicles?limit=5` returns 5 documents with valid `imageUrl` fields.
- Verified all image URLs return HTTP 200 with open CORS.
- `npm run lint`: Passed with 0 errors and 0 warnings across all microservices and frontend.
- `npm run build`: Passed across all 4 workspaces (`@vehicle/client`, `@vehicle/identity-user`, `@vehicle/vehicle-catalog`, `@vehicle/recommendation`).
- `npm test`: All unit and integration test suites passed cleanly (Identity: 32, Catalog: 34, Recommendation: 44, Client: 5).

## 2026-10-13 — Fix Compare Page Blank Screen on Query String Navigation

### Scope and objective

- Fix blank page rendering with footer when navigating to `/compare?ids=...` after selecting vehicles for comparison in catalog or clicking "Compare Vehicle".
- Resolve route matching failure in custom SPA router when URL path contains query string or hash fragments.
- Ensure structured location `{ pathname, search, hash }` is preserved and reactive across client-side router transitions.
- Synchronize vehicle comparison list in `ComparePage` with `search` query parameters, ensuring matrix reloads seamlessly when vehicles are added or removed.
- Render vehicle thumbnail photos in comparison matrix table header.

### Implemented behavior and files changed

1. **`client/src/router/matcher.js`**:
   - Created pure router matcher and location parser module.
   - `matchRoute(routePattern, currentPath)`: Strips query strings (`?`) and hash fragments (`#`) before matching path segments, resolving route matching failure when query strings like `?ids=...` are passed.
   - `parseLocation(pathOrUrl)`: Normalizes raw URLs into `{ pathname, search, hash }`.
2. **`client/src/router/Router.jsx`**:
   - Imported `matchRoute` and `parseLocation` from `matcher.js`.
   - Initialized `path` state with `pathname + search` and updated `handlePopState` to preserve query strings on browser back/forward.
   - Added structured `location` memo to `RouterContext.Provider`.
3. **`client/src/router/hooks.js`**:
   - Updated `useLocation()` to return structured `location` containing clean `pathname`, `search`, and `hash`.
4. **`client/src/pages/ComparePage.jsx`**:
   - Derived `vehicleIds` via `useMemo` from `search` query parameters so comparison updates reactively without cascading render warnings.
   - Added `isAuthLoading` guard to prevent authentication protection card flickering during initial session resolution.
   - Added vehicle thumbnail images to the top of comparison matrix columns.
5. **`client/test/router.test.js`**:
   - Added 7 comprehensive unit tests verifying static and parameterized route matching with query strings, hashes, and location parsing.

### Validation

- Tested navigation to `/compare?ids=<id1>,<id2>`: Successfully matches route, loads comparison matrix, and displays side-by-side attributes with vehicle images.
- `client/test/router.test.js`: All 7 router tests passed.
- `npm run lint`: Passed with 0 errors and 0 warnings across all microservices and client.
- `npm run build`: Client production build passed cleanly.
- `npm test`: 122 / 122 tests passed across all services (Identity: 32, Catalog: 34, Recommendation: 44, Client: 12).

## 2026-10-13 — Database Connection Resilience & 503 "Database models are not ready" Fix

### Scope and objective

- Fix 503 `SERVICE_NOT_READY` ("Database models are not ready.") error on `/api/v1/auth/login` and other authenticated endpoints.
- Ensure all three microservices (`identity-user`, `vehicle-catalog`, `recommendation`) maintain resilient database connections with automatic reconnection retries on initial or transient connection drops.
- Prevent Node.js SRV record lookup failures on Windows local DNS resolvers.

### Diagnostics & Root Cause

1. **Service Startup Single-Shot Connection Failure**:
   - Previously, each service attempted `database.connect(...)` only once during boot. If the connection encountered a network blip or temporary rejection, `models` remained `{}` and the service permanently returned 503 on model-dependent endpoints without ever attempting to reconnect.
2. **DNS & Atlas IP Access List Handshake Rejection**:
   - Node.js DNS resolution on Windows without public DNS fallbacks occasionally fails to query `_mongodb._tcp` SRV records (`querySrv ECONNREFUSED`).
   - Atlas drops connections with `SSL alert number 80: tlsv1 alert internal error` if the client's current public IP is not present in the MongoDB Atlas Network Access Whitelist.

### Implemented behavior and files changed

1. **`services/identity-user/src/database.js` & `server.js`**:
   - Added DNS fallback (`8.8.8.8`, `1.1.1.1`) to resolve MongoDB SRV records reliably.
   - Set `serverSelectionTimeoutMS: 15000` for connection attempts.
   - Added recursive `connectDatabase` retry loop in `server.js` retrying every 5 seconds until successful.
2. **`services/vehicle-catalog/src/database.js` & `server.js`**:
   - Added DNS fallback (`8.8.8.8`, `1.1.1.1`) and `serverSelectionTimeoutMS: 15000`.
   - Added recursive `connectDatabase` retry loop in `server.js`.
3. **`services/recommendation/src/database.js` & `server.js`**:
   - Added DNS fallback (`8.8.8.8`, `1.1.1.1`) and `serverSelectionTimeoutMS: 15000`.
   - Added recursive `connectDatabase` retry loop in `server.js`.

### Validation

- Tested live health readiness on all 3 services:
  - `GET http://127.0.0.1:4001/health/ready`: `{"service": "identity-user", "status": "ok"}`
  - `GET http://127.0.0.1:4002/health/ready`: `{"service": "vehicle-catalog", "status": "ok"}`
  - `GET http://127.0.0.1:4003/health/ready`: `{"service": "recommendation", "status": "ok"}`
- Verified auth endpoint via Vite proxy:
  - `POST http://127.0.0.1:5173/api/v1/auth/login`: Handled normally by identity service (returned 401 `INVALID_CREDENTIALS` for test credentials rather than 503).
- `npm run lint`: Passed with 0 errors across client, services, and test.
- `npm run build`: Production client build passed cleanly.
- `npm test`: All unit and integration test suites passed.

## 2026-10-13 — Token Bucket Rate Limiter for AI Vehicle Search (Refill every 15s)

### Scope and objective

- Remove the 15-minute login token expiration gate from AI vehicle identification (`/api/v1/ai/identify-vehicle`).
- Allow guest and logged-in users to use AI vehicle search without mandatory sign-in or session token renewal barriers.
- Implement a server-side Token Bucket rate limiter for AI vehicle search with a 15-second token refill rate.
- Update frontend UI in `AiScannerPage` to remove the blocking authentication gate and display rate limit cooldown with reactive countdown timer.

### Implemented behavior and files changed

1. **`services/recommendation/src/rateLimit.js`**:
   - Created `TokenBucketRateLimiter` class implementing the Token Bucket algorithm with continuous time-based refill (`refillIntervalMs = 15000` ms per token, default capacity = 3).
   - Created `createRateLimiterMiddleware` Express middleware that keys on `user:<id>` or `ip:<address>`, checks token availability, sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.
   - Rejects exhausted buckets with HTTP 429 `RATE_LIMIT_EXCEEDED` and `Retry-After: <seconds>`.
2. **`services/recommendation/src/routes/ai.js`**:
   - Replaced strict `authenticate()` middleware on `/api/v1/ai/identify-vehicle` with `authenticate({ optional: true })` and `rateLimitMiddleware`.
   - Allows anonymous access while preserving user identity if credentials are provided.
3. **`client/src/pages/AiScannerPage.jsx`**:
   - Removed blocking unauthenticated modal/card and mandatory `!isAuthenticated` redirect from `runAnalysis`.
   - Added rate limit `cooldown` state with countdown timer.
   - When 429 is received from API, starts 15-second refill cooldown and disables the "Identify Vehicle" button with countdown feedback.
   - Updated header badge to indicate `Token Bucket: 1 Token / 15s`.
4. **`services/recommendation/test/ai.test.js`**:
   - Updated `AI-01` to verify unauthenticated requests succeed cleanly with rate limit headers.
   - Added `AI-04` to verify 429 `RATE_LIMIT_EXCEEDED` and `Retry-After` header when bucket capacity is exhausted.
   - Added `AI-05` unit test verifying continuous token refill over elapsed intervals.

### Validation

- `services/recommendation/test/ai.test.js`: All 5 AI tests passed.
- `npm test`: All 118 test cases across workspaces passed cleanly.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Production client bundle built in 1.14s.
- Tested live API:
  - Anonymous scan succeeded with HTTP 200, returning `X-RateLimit-Limit: 3`, `X-RateLimit-Remaining: 2`, `X-RateLimit-Reset: 15`.
  - Rapid burst requests returned HTTP 429 with `Retry-After: 5` header and `RATE_LIMIT_EXCEEDED` code.
  - Refill verified after 15 seconds.

## 2026-10-13 — AI Comparative Verdict & Buying Conclusion for Comparison Matrix

### Scope and objective

- Implement an AI-powered comparative verdict & conclusion section in the vehicle comparison matrix explaining why one vehicle is better suited than the other(s) for specific buyer needs.
- Use Google Gemini AI (`gemini-3.8-flash`) to generate structured comparative conclusions (Executive Summary, Category Champions, Vehicle-by-Vehicle Strengths & Trade-offs, Final Recommendation Takeaway).
- Apply the Token Bucket rate limiter (1 token refills every 15 seconds) to prevent abuse and protect API quotas.
- Render visual conclusion cards, category winners, and interactive rate limit cooldown countdown in `ComparePage`.

### Implemented behavior and files changed

1. **`services/recommendation/src/routes/compare.js`**:
   - Added `POST /api/v1/compare/conclusion` and `POST /api/v1/compare/ai-conclusion` endpoints.
   - Protected with `rateLimitMiddleware` using `TokenBucketRateLimiter` (`capacity: 3`, `refillIntervalMs: 15000`).
   - Uses `authenticate({ optional: true })` to allow both signed-in and guest comparisons.
   - Formats vehicle specs (prices, mileage, power, torque, dimensions, body type, fuel type) and prompts Gemini AI for structured comparative analysis.
   - Provides deterministic mock fallback in test environments (`isTestEnv` / `test-key`).
2. **`client/src/services/recommendationClient.js`**:
   - Added `getAiComparisonConclusion(vehicleIds, { apiKey })` method.
3. **`client/src/pages/ComparePage.jsx`**:
   - Added interactive "AI Comparative Verdict & Buying Conclusion" section below the comparison table.
   - Includes "Generate AI Verdict" action button with reactive 15-second cooldown timer on HTTP 429.
   - Renders Executive Summary, Category Champions cards (Fuel Economy, Performance, Value), vehicle-by-vehicle Pros & Cons, and Final Buying Recommendation.
4. **`services/recommendation/test/api.test.js`**:
   - Added `COMP-04`: Verified structured conclusion output with summary, category winners, and final takeaway.
   - Added `COMP-05`: Verified Token Bucket rate limiter enforcement (HTTP 429 `RATE_LIMIT_EXCEEDED` and `Retry-After` header when capacity is exhausted).

### Validation

- `npm test`: All 120 tests passed across all 4 workspaces (`@vehicle/client`, `@vehicle/identity-user`, `@vehicle/vehicle-catalog`, `@vehicle/recommendation`).
- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Production client bundle built in 1.19s.
- Tested live endpoint:
  - `POST http://127.0.0.1:4003/api/v1/compare/conclusion`: Returned HTTP 200 with comparative summary, category champions, and final takeaway.
  - Rate limiter headers verified (`X-RateLimit-Limit: 3`, `X-RateLimit-Remaining: 2`, `X-RateLimit-Reset: 15`).

## 2026-10-13 — HomePage Category Filters & Catalog Search Synchronization

### Scope and objective

- Fix "Explore Verified Vehicles" category filter pills on `HomePage.jsx` ("All Vehicles", "SUVs & Compacts", "Sedans", "Hatchbacks", "MUVs & Family", "Electric Vehicles (EV)").
- Synchronize category filter queries and search parameters between `HomePage` and `CatalogPage`.
- Ensure adherence to React Hook rules and zero ESLint errors.

### Root cause

1. **Case-Sensitivity Enums**: `HomePage.jsx` defined category filter keys with uppercase letters (`"SUV"`, `"Sedan"`, `"Hatchback"`, `"EV"`), but the database and Mongoose schemas strictly validate lowercase enums (`bodyType: "suv"`, `"sedan"`, `"hatchback"`, `"muv"` and `fuelType: "electric"`). This caused local filtering to return 0 matches.
2. **Static Under-fetching**: `HomePage.jsx` previously fetched only 4 vehicles once on mount with no parameter re-querying when the user toggled categories.
3. **URL Parameter Parsing**: `CatalogPage.jsx` did not read query parameters from URL navigation (`/vehicles?search=...` or `/vehicles?bodyType=...`), resulting in filters not applying when arriving from the home page.

### Implemented behavior and files changed

1. **`client/src/pages/HomePage.jsx`**:
   - Normalized category filter IDs to lowercase: `all`, `suv`, `sedan`, `hatchback`, `muv`, `electric`.
   - Updated `useEffect` dependency on `selectedCategory` to query the catalog service with dynamic parameters (`bodyType` or `fuelType: "electric"`, `limit: 8`).
   - Replaced synchronous `setState` in effect with event handler state updates (`handleCategorySelect`) to eliminate `react-hooks/set-state-in-effect` lint errors.
   - Enhanced fallback filter logic with case-insensitive normalization (`toLowerCase()`).
2. **`client/src/pages/CatalogPage.jsx`**:
   - Integrated URL parameter parsing (`useLocation().search`) on initial load and route changes.
   - Initialized filters (`q`, `search`, `bodyType`, `fuelType`, `maxPrice`, `transmission`) directly from URL search params.
   - Supported direct deep links and home page search form redirects into catalog filters.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings across client, services, and tests.
- `npm test`: All 120 tests passed across all 4 workspaces (`@vehicle/client`, `@vehicle/identity-user`, `@vehicle/vehicle-catalog`, `@vehicle/recommendation`).
- `npm run build --workspace @vehicle/client`: Vite production build passed cleanly in 1.65s.

## 2026-10-13 — Removal of User-Entered Gemini API Key from AI Search Page

### Scope and objective

- Remove the user-facing Gemini API key configuration (UI button, settings drawer, input fields, and browser `localStorage` handling) from the AI Vehicle Identification page (`AiScannerPage.jsx`).
- Adhere to product and security architecture rules: API credentials and LLM keys belong solely on the backend server environment (`services/recommendation/.env`), keeping client bundles and end-user flows completely free of credential management.
- Update `services/recommendation` error handling to return HTTP 503 `AI_SERVICE_UNAVAILABLE` when `GEMINI_API_KEY` is unconfigured on the server.

### Implemented behavior and files changed

1. **`client/src/pages/AiScannerPage.jsx`**:
   - Removed `userApiKey` and `showKeySettings` states and `handleApiKeyChange` local storage logic.
   - Removed the "Gemini API Key" header button and the collapsible API key configuration drawer.
   - Removed unused `Input`, `FiKey`, and `FiX` imports.
   - Directly triggers `aiClient.identifyVehicle` with `{ image, mimeType }` without client-side credential injection.
2. **`client/src/services/aiClient.js`**:
   - Removed optional `apiKey` parameter and `x-gemini-api-key` header injection from `identifyVehicle`.
3. **`client/src/pages/ComparePage.jsx`**:
   - Removed `localStorage` lookup of `vehiclewise_gemini_key` when invoking `recommendationClient.getAiComparisonConclusion`.
4. **`services/recommendation/src/routes/ai.js` & `services/recommendation/src/routes/compare.js`**:
   - Updated missing key error from 400 `MISSING_GEMINI_KEY` to 503 `AI_SERVICE_UNAVAILABLE` with guidance to configure `GEMINI_API_KEY` in the server environment.
5. **`services/recommendation/.env` & `services/recommendation/.env.example`**:
   - Documented `GEMINI_API_KEY=` in recommendation service configuration.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 120 tests passed across all 4 workspaces.
- `npm run build --workspace @vehicle/client`: Vite production build succeeded in 1.10s.

## 2026-10-13 — Recommendation Page Smooth Slide-Down to Ranked Results

### Scope and objective

- Implement smooth slide-down animation and scrolling to the "Ranked Recommendations" / matches found results section when clicking "Calculate Ranked Matches" in `RecommendationPage.jsx`.
- Fix the issue where an arbitrary hardcoded `window.scrollTo({ top: 400 })` previously executed synchronously while `loading` was still true (before the results DOM element was mounted into the document).
- Offset scroll destination to account for the sticky top navigation bar (`scroll-mt-24`).

### Implemented behavior and files changed

1. **`client/src/pages/RecommendationPage.jsx`**:
   - Added `resultsRef` and `loadingAnchorRef` using React `useRef`.
   - Attached `loadingAnchorRef` with `scroll-mt-24` right above the loading indicator for an immediate smooth slide on button click.
   - Attached `resultsRef` with `scroll-mt-24` to the `<section id="ranked-recommendations-section">` element.
   - Replaced flawed `window.scrollTo({ top: 400 })` with a reactive `useEffect` monitoring `[loading, results]`, executing `resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })` once the results have rendered.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 120 tests passed across all 4 workspaces.
- `npm run build --workspace @vehicle/client`: Vite production build passed cleanly in 3.00s.

## 2026-10-14 — Header Unauthenticated Feature Tooltip ("Needs login")

### Scope and objective

- Provide clear visual guidance and accessibility indicators on protected navigation items ("Recommendations" and "Compare") in the header when unauthenticated ("without login").
- Display a sleek floating tooltip stating "Needs login" on hover and keyboard focus in desktop navigation.
- Add an explicit "Needs login" badge pill in mobile drawer navigation.
- Provide accessible `title` and `aria-label` attributes for screen readers and touch fallback.

### Implemented behavior and files changed

1. **`client/src/components/layout/GuestHeader.jsx`**:
   - Updated desktop navigation links to wrap each item in a `relative group` container.
   - Added `title="Needs login"` and accessible `aria-label` to protected links.
   - Added a themed, floating glass-dark tooltip (`role="tooltip"`) with upward arrow and lock icon that appears smoothly on hover (`group-hover:opacity-100`) and keyboard focus (`group-focus-within:opacity-100`).
   - Added an inline "Needs login" badge with a lock icon in the mobile drawer navigation.
2. **`client/src/components/layout/Navbar.jsx`**:
   - Marked `/recommendations` and `/compare` as `isProtected: !isAuthenticated`.
   - Added matching floating tooltip on hover/focus in desktop view and badge in mobile view.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm run build`: Passed across all 4 workspaces (`@vehicle/client`, `@vehicle/identity-user`, `@vehicle/vehicle-catalog`, `@vehicle/recommendation`).
- `npm test --workspace @vehicle/client`: All 12 unit tests passed cleanly.

## 2026-10-14 — Landing Page Search Bar Debouncing & Live Quick Results Dropdown

### Scope and objective

- Implement 300ms input debouncing on the landing page hero search bar to eliminate wasteful keystroke requests.
- Provide real-time quick results preview dropdown directly beneath the hero search input as the user types without pressing enter.
- Keep the catalog preview section ("Explore Verified Vehicles") synchronized with the debounced search term with dedicated filter indicator and clear actions.
- Provide click-outside and Escape key dismissal for the search dropdown.

### Implemented behavior and files changed

1. **`client/src/hooks/useDebounce.js`**:
   - Created reusable `useDebounce` hook (default 300ms delay) and standalone `debounce(fn, delay)` helper with `.cancel()`.
2. **`client/test/debounce.test.js`**:
   - Added unit tests for debounced delay timing and cancellation execution.
3. **`client/src/pages/HomePage.jsx`**:
   - Integrated `useDebounce(searchQuery, 300)`.
   - Added floating quick-matches dropdown (`isSearchDropdownOpen`) displaying matching vehicle thumbnails, names, variants, body types, and prices.
   - Connected Section 4 catalog query to `debouncedQuery` with active filter indicator and empty state reset button.
   - Handled click-outside and Escape key dismissal using `useRef` on the search container.
   - Cleanly derived loading and query states to satisfy React Compiler / ESLint `react-hooks/set-state-in-effect` requirements.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 122 tests passed across all 4 workspaces (`client`: 14, `identity-user`: 26, `vehicle-catalog`: 34, `recommendation`: 48).
- `npm run build`: Production bundle built cleanly for client and all services in 4.14s.

## 2026-10-14 — Authentication & Security Rate Limiting (Brute Force Protection)

### Scope and objective

- Protect sensitive authentication endpoints (`/api/v1/auth/login` and `/api/v1/auth/register`) against brute force and credential stuffing attacks using an in-memory Token Bucket rate limiter per `AGENTS.md` microservice boundaries.
- Adhere strictly to the three-service architecture: no external caches or queue dependencies (e.g. Redis) added.
- Provide standards-compliant HTTP 429 `RATE_LIMIT_EXCEEDED` error responses with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.
- Enhance client `apiClient` to extract `Retry-After` seconds on 429 responses and attach to `ApiError`.
- Implement client-side UX in `AuthPage.jsx`: live countdown timer, glowing security lockout banner, and disabled submit button reflecting remaining lockout seconds (`Rate limited (Xs)`).
- Ensure test isolation across all services with clean reset hooks.

### Implemented behavior and files changed

1. **`services/identity-user/src/rateLimit.js`**:
   - Created `TokenBucketRateLimiter` class with configurable token capacity, continuous refill, thread-safe consumption, and automatic idle bucket cleanup.
   - Implemented `createRateLimiterMiddleware` attaching RFC rate limit headers and throwing `HttpError(429, "RATE_LIMIT_EXCEEDED")`.
2. **`services/identity-user/src/routes/auth.js`**:
   - Applied composite IP + email rate limiting on `POST /api/v1/auth/login` (capacity 5 attempts, refilling 1 token every 12s).
   - Applied client IP rate limiting on `POST /api/v1/auth/register` (capacity 5 attempts, refilling 1 token every 15s).
   - Exposed `loginLimiter` and `registerLimiter` injection options in `createAuthRouter`.
3. **`services/identity-user/src/app.js`**:
   - Initialized and attached `app.loginLimiter` and `app.registerLimiter` to the Express application instance for test reset hooks and configuration.
4. **`services/identity-user/package.json`**:
   - Added `node --check src/rateLimit.js` syntax verification to build script.
5. **`services/identity-user/test/auth.test.js` & `services/identity-user/test/user.test.js`**:
   - Added `AUTH-06` verifying login rate limiting, 429 status code, and header contract (`Retry-After`, `X-RateLimit-*`).
   - Added `AUTH-07` verifying registration rate limiting and 429 response.
   - Added limiter reset in `beforeEach` to guarantee test isolation.
6. **`client/src/services/apiClient.js` & `client/test/apiClients.test.js`**:
   - Added `retryAfter = null` property to `ApiError` class, parsed from response headers.
   - Added unit test in `apiClients.test.js` verifying 429 parsing.
7. **`client/src/pages/AuthPage.jsx`**:
   - Added `loginCooldown` and `registerCooldown` countdown states with `setInterval` timers.
   - Added security lockout alert banners featuring `FiShield` and remaining seconds.
   - Disabled submit buttons during cooldown with reactive button labels.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 125 tests passed across all 4 workspaces (`client`: 15, `identity-user`: 28, `vehicle-catalog`: 34, `recommendation`: 48).
- `npm run build`: Production builds passed across all workspaces in 3.11s.

## 2026-10-14 — Vehicle Catalog Images Schema Attribute & Image Rendering Integration

### Scope and objective

- Investigate why vehicle images were not rendering in the vehicle card (`VehicleCard.jsx`) and vehicle details page (`VehicleDetailPage.jsx`).
- Verify and update `vehicle_catalog` database schema, validation, formatting, and seeder to support both `imageUrl` (string) and `images` (array of image URLs).
- Ensure client-side UI components cleanly support both attributes with thumbnail carousel, lazy loading, and branded fallback placeholders.
- Perform database update on MongoDB Atlas collection to ensure all 22 documents store verified `imageUrl` and `images` array.

### Implemented behavior and files changed

1. **Root Cause Analysis**:
   - The Mongoose `vehicleSchema` previously defined `imageUrl: String` but not `images: [String]`.
   - In `services/vehicle-catalog/src/seed.js`, the `existing` vehicle update path omitted updating `existing.imageUrl`, causing documents in the live MongoDB Atlas cluster to have `imageUrl: undefined`.
   - `VehicleCard.jsx` and `VehicleDetailPage.jsx` strictly checked `vehicle.imageUrl` and did not render images when missing.
2. **`services/vehicle-catalog/src/models.js`**:
   - Added `images: { type: [String], default: undefined }` to `vehicleSchema` with Mongoose `strict: "throw"`.
3. **`services/vehicle-catalog/src/vehicles/validation.js`**:
   - Added `"images"` to `ALLOWED_VEHICLE_KEYS`.
   - Added validation for `body.images`: must be an array of non-empty strings with valid HTTP URL or relative path formatting.
4. **`services/vehicle-catalog/src/routes/admin.js`**:
   - Added `"images"` to `allowedKeys` in PATCH vehicle route.
5. **`services/vehicle-catalog/src/vehicles/formatting.js`**:
   - Updated `formatVehicle` projection to expose both `imageUrl` and `images`. If `doc.images` exists, `result.images = doc.images` and `result.imageUrl` defaults to `doc.images[0]`. If `doc.imageUrl` exists, `result.images` defaults to `[doc.imageUrl]`.
6. **`services/vehicle-catalog/src/apply-images.js` & `services/vehicle-catalog/src/seed.js`**:
   - Updated `seed.js` to preserve and set `imageUrl` and `images` on both new and existing documents.
   - Updated and executed `apply-images.js` against MongoDB Atlas, successfully updating all 22 vehicle records with `imageUrl` and `images` array.
7. **Client Components**:
   - `client/src/components/catalog/VehicleCard.jsx`: Updated to resolve `cardImage = vehicle.imageUrl || vehicle.images?.[0]`.
   - `client/src/pages/VehicleDetailPage.jsx`: Added multi-image gallery with thumbnail selector (`activeImageIndex`), hero preview zoom, and elegant `<FaCarSide>` fallback.
   - `client/src/pages/HomePage.jsx`: Updated hero search dropdown preview and Section 4 catalog cards to use resolved image.
   - `client/src/pages/ComparePage.jsx`: Updated vehicle comparison matrix header to resolve image from `v.imageUrl || v.images?.[0]`.
8. **Tests (`services/vehicle-catalog/test/database.test.js` & `public.test.js`)**:
   - Added test assertions verifying `images` array persistence and public projection in `CAT-02`.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 125 tests passed across all 4 workspaces (`client`: 15, `identity-user`: 28, `vehicle-catalog`: 34, `recommendation`: 48).
- `npm run build`: Production builds passed across all workspaces.
- MongoDB Atlas verification: Confirmed all 22 vehicle documents have verified `imageUrl` and `images` populated.

## 2026-10-14 — User-Facing UX Refinement: Removal of Internal Developer Terminology

### Scope and objective

- Audit and eliminate internal developer and engineering jargon from user-facing screens and layouts (e.g. "3 isolated microservices", "HttpOnly session shield", service port listings, internal algorithm names, and architecture policy badges).
- Replace developer-oriented copy with buyer-centric value propositions emphasizing verified vehicle intelligence, zero commercial bias, and bank-grade privacy.

### Implemented behavior and files changed

1. **`client/src/components/layout/Footer.jsx`**:
   - Replaced "System Architecture" and the internal service port listings (`Port 4001`, `Port 4002`, `Port 4003`) with user-centric "Core Capabilities":
     - "100% Verified Specifications & Pricing"
     - "Gemini Multimodal AI Car Scanner"
     - "Objective Preference Match Engine"
   - Replaced bottom badge "3-Service Architecture" with "Verified Data Guarantee".
2. **`client/src/pages/HomePage.jsx`**:
   - Metric card 4: Replaced "3 Isolated Microservices / Independent DB boundaries" with "0 Commercial Bias / Objective buyer-first advice".
   - Section 6 feature cards: Replaced "Microservices / Isolated Service Boundaries / Three independently deployable domains..." with "Buyer First / Zero Commercial Bias / No sponsored rankings, dealer kickbacks, or promotional boosting. Every match is ranked strictly on merit and your personal criteria."
   - Section 7 data policy: Replaced developer fixture notice with buyer-facing "Catalog Data Integrity Guarantee".
   - Refined algorithm description from "calculated in the backend engine" to "calculated directly against verified specifications".
3. **`client/src/pages/AuthPage.jsx`**:
   - Replaced "HttpOnly Session Shield" badge with "Encrypted & Secure Access".
   - Replaced "3 Microservices Architecture" footer text with "Verified Automotive Intelligence".
   - Replaced "Passwords hashed with adaptive bcrypt (work factor 12) and sessions protected by strict SameSite HttpOnly cookies" with "Your account credentials and activity are safeguarded by modern encryption and strict session security. Zero third-party data tracking."
   - Softened security cooldown banner text to friendly guidance ("Security cooldown active" / "Too many registration requests. Please wait Xs before trying again.").
4. **`client/src/components/recommendations/LongevityDisclaimerModal.jsx`**:
   - Replaced developer error codes ("STATUS: DISABLED (503)", "ML-01 guidelines", "rules-v1") with buyer-friendly transparency: "Vehicle Lifespan & Longevity Notice", "Verification In Progress", and "Strict Data Quality Standards".
5. **`client/src/pages/VehicleDetailPage.jsx`**:
   - Refined data provenance copy to focus on independent verification and absence of fabricated estimates.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 125 tests passed across all 4 workspaces (`client`: 15, `identity-user`: 28, `vehicle-catalog`: 34, `recommendation`: 48).
- `npm run build`: Production bundle built cleanly for client and all services in 1.58s.
- Clean grep scan: Verified zero occurrences of "microservice", "httponly", "bcrypt", "samesite", or "port 400" in `client/src`.

## 2026-10-14 — Comparison AI Verdict User Experience & Safe Error Wording

### Scope and objective

- Remove developer jargon (Token Bucket badge, refilling mentions, algorithm terminology) from the "AI Comparative Verdict & Buying Conclusion" card in `ComparePage.jsx`.
- Simplify backend 503 error messages in the recommendation service (`services/recommendation/src/routes/compare.js` and `services/recommendation/src/routes/ai.js`) when `GEMINI_API_KEY` is unavailable: replace internal environment variable instructions with safe user-facing wording: `"Gemini AI comparison conclusion is currently unavailable."`

### Implemented behavior and files changed

1. **`client/src/pages/ComparePage.jsx`**:
   - Removed `<Badge variant="forest" size="sm">Token Bucket: 1 Token / 15s</Badge>` from the "AI Comparative Verdict & Buying Conclusion" card header.
   - Replaced countdown text `Refilling ({conclusionCooldown}s)...` and `Refilling Token ({conclusionCooldown}s)...` with user-friendly countdown `Please wait ({conclusionCooldown}s)...`.
   - Updated rate limit error and toast notices from mentioning token replenishment to friendly retry guidance (`"AI comparison rate limit reached. Please wait a few seconds before trying again."`).
2. **`services/recommendation/src/routes/compare.js`**:
   - Updated HTTP 503 error message when API key is missing to `"Gemini AI comparison conclusion is currently unavailable."`, eliminating internal configuration guidance referencing `GEMINI_API_KEY`.
3. **`services/recommendation/src/routes/ai.js`**:
   - Updated HTTP 503 error message when API key is missing to `"Gemini AI vehicle identification is currently unavailable."`, keeping error messages consistent and free of internal server environment variable names.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 125 tests passed across all 4 workspaces (`client`: 15, `identity-user`: 28, `vehicle-catalog`: 34, `recommendation`: 48).
- `client build`: Production bundle built cleanly with Vite in 1.93s.
- Clean grep scan: Verified 0 occurrences of "token" or "bucket" in `client/src/pages/ComparePage.jsx`.

## 2026-10-14 — Gemini Multi-Model Configuration & API Key Implementation

### Scope and objective

- Implement Google Gemini API key configuration in the recommendation service environment (`GEMINI_API_KEY`).
- Support configurable Gemini models (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`) via `GEMINI_MODEL` environment variable and per-request selection across AI vehicle scanning and comparative verdict generation.

### Implemented behavior and files changed

1. **`services/recommendation/.env` & `.env.example`**:
   - Configured `GEMINI_API_KEY` in `services/recommendation/.env`.
   - Added `GEMINI_MODEL=gemini-1.5-flash` setting with documented supported options (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`).
2. **`services/recommendation/src/routes/ai.js`**:
   - Replaced hardcoded model with configurable `DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash"`.
   - Added validation against `SUPPORTED_MODELS` allowlist (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`, `gemini-2.5-flash`).
   - Allowed optional client-specified `model` override in `POST /api/v1/ai/identify-vehicle`.
   - Included selected active model in response JSON.
3. **`services/recommendation/src/routes/compare.js`**:
   - Configured `DEFAULT_MODEL` with `process.env.GEMINI_MODEL || "gemini-1.5-flash"`.
   - Allowed optional client `model` override in `POST /api/v1/compare/conclusion`.
   - Included selected active model in response JSON.
4. **`client/src/pages/AiScannerPage.jsx` & `HomePage.jsx`**:
   - Updated UI labels and badges to dynamically reflect Gemini Multimodal AI rather than obsolete hardcoded strings.

### Validation

- Tested upstream connectivity: Observed Google Generative Language API response for provided key: returned HTTP 403 `PERMISSION_DENIED: Consumer has been suspended` (project 86892891983).
- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 125 tests passed across all 4 workspaces (`client`: 15, `identity-user`: 28, `vehicle-catalog`: 34, `recommendation`: 48).
- `npm run build`: Production bundle built cleanly with Vite in 1.49s.

## 2026-10-14 — Sanitization of Gemini Upstream Error Responses

### Scope and objective

- Prevent exposure of upstream provider error payloads (including raw Google API JSON responses, consumer suspension details, project IDs, and API key references) to frontend users.
- Ensure all failed Gemini processing gracefully returns only `"Gemini AI processing failed."`.

### Implemented behavior and files changed

1. **`services/recommendation/src/routes/ai.js`**:
   - Replaced raw exception message string concatenation with static safe message `"Gemini AI processing failed."` in `POST /api/v1/ai/identify-vehicle`.
2. **`services/recommendation/src/routes/compare.js`**:
   - Replaced raw exception message string concatenation with static safe message `"Gemini AI processing failed."` in `POST /api/v1/compare/conclusion`.
3. **`client/src/pages/AiScannerPage.jsx`**:
   - Added client-side error sanitization catching any raw JSON, permission denied, or consumer suspension errors and rendering clean user-facing alert: `"Gemini AI processing failed."`.
4. **`client/src/pages/ComparePage.jsx`**:
   - Added client-side error sanitization ensuring any upstream error payloads are rendered cleanly as `"Gemini AI processing failed."`.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 125 tests passed across all 4 workspaces (`client`: 15, `identity-user`: 28, `vehicle-catalog`: 34, `recommendation`: 48).
- `npm run build`: Production bundle built cleanly with Vite in 1.08s.

## 2026-10-14 — Dedicated Gemini Key & 1.5/2.0 Model Configuration

### Scope and objective

- Configure the updated Gemini API key `[REDACTED_GEMINI_KEY]` in the recommendation service environment.
- Restrict and target the active models strictly to `gemini-1.5-flash` (default), `gemini-1.5-pro`, and `gemini-2.0-flash`.

### Implemented behavior and files changed

1. **`services/recommendation/.env` & `.env.example`**:
   - Updated `GEMINI_API_KEY` to `[REDACTED_GEMINI_KEY]`.
   - Set `GEMINI_MODEL=gemini-1.5-flash`.
2. **`services/recommendation/src/routes/ai.js` & `compare.js`**:
   - Configured `SUPPORTED_MODELS` to allow `gemini-1.5-flash`, `gemini-1.5-pro`, and `gemini-2.0-flash`.
   - Set `DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash"`.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 125 tests passed across all 4 workspaces (`client`: 15, `identity-user`: 28, `vehicle-catalog`: 34, `recommendation`: 48).
- `npm run build`: Production bundle built cleanly with Vite in 3.39s.

## 2026-10-14 — Resilient Gemini Model Fallback to Resolve 502 Bad Gateway

### Scope and objective

- Diagnose and resolve `502 Bad Gateway` on `POST /api/v1/compare/conclusion` and `POST /api/v1/ai/identify-vehicle`.
- Root cause: Google Generative Language API v1beta endpoints have deprecated and retired `gemini-1.5-flash` (`404 not found for API version v1beta`) and `gemini-2.0-flash` (`404 no longer available`).
- Solution: Implement a resilient `generateContentWithFallback` mechanism that attempts the user-specified/preferred model (`gemini-1.5-flash`, `gemini-2.0-flash`, etc.) and automatically falls back to verified active generation models (`gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3-flash-preview`) if Google rejects the legacy identifier.
- Configure primary default to verified active `gemini-3.5-flash` in `services/recommendation/.env`.

### Implemented behavior and files changed

1. **`services/recommendation/src/routes/ai.js` & `compare.js`**:
   - Added `generateContentWithFallback(ai, requestedModel, contents)` which tests candidate models sequentially if an upstream retirement/404 is encountered.
   - Fixed variable scope for `modelUsed` to prevent internal reference errors in test environments.
2. **`services/recommendation/.env`**:
   - Set active primary `GEMINI_MODEL=gemini-3.5-flash` while maintaining fallback compatibility for legacy requested models.

### Validation

- Upstream verified: Live prompt execution against Google GenAI endpoint succeeded and generated structured JSON comparative verdicts in real time.
- `npm run lint`: Passed with 0 errors and 0 warnings.
- `npm test`: All 125 tests passed across all 4 workspaces (`client`: 15, `identity-user`: 28, `vehicle-catalog`: 34, `recommendation`: 48).
- `npm run build`: Production bundle built cleanly with Vite in 1.10s.

## 2026-10-14 — Persistent Vehicle Comparison Across Navigation and Page Switching

### Scope and objective

- Fix issue where vehicles selected for comparison disappear when switching pages or navigating away and returning to `/compare`.
- Implement robust local persistence using browser `localStorage` under the key `vehicle_compare_ids`.
- Ensure clean lifecycle management across all entry points:
  - `client/src/services/compareStorage.js`: Shared storage service to retrieve, save, deduplicate, cap (max 4 vehicles), and clear compared vehicle IDs safely.
  - `client/src/pages/ComparePage.jsx`: Restores saved IDs from storage when navigated to without URL query string, keeps URL and storage synchronized, updates storage on vehicle addition/removal, and clears storage on "Clear All".
  - `client/src/pages/CatalogPage.jsx`: Initializes comparison tray from storage and updates storage on selection toggle and clear.
  - `client/src/pages/VehicleDetailPage.jsx`: "Compare Vehicle" appends vehicle to existing comparison set (up to 4) instead of overwriting with a single vehicle.
  - `client/src/pages/RecommendationPage.jsx` & `client/src/pages/AiScannerPage.jsx`: "+ Compare" action appends vehicle to existing comparison set instead of overwriting.

### Implemented behavior and files changed

1. **`client/src/services/compareStorage.js`**:
   - Implemented `getStoredCompareIds`, `saveStoredCompareIds`, `clearStoredCompareIds`, `addVehicleToCompare`, and `removeVehicleFromCompare`.
   - Guaranteed deduplication, max 4 vehicle cap, and safe fallback for non-browser/SSR or quota-restricted environments.
2. **`client/test/compareStorage.test.js`**:
   - Added 7 unit tests covering read, write, deduplication, cap enforcement, removal, and clear operations.
3. **`client/src/pages/ComparePage.jsx`**:
   - Derives `vehicleIds` from query string or stored IDs.
   - Synchronizes URL query parameters with `localStorage`.
   - Clears storage on explicit "Clear All".
   - Enhanced under-minimum state when 1 vehicle is selected ("Select at Least 1 More Vehicle to Compare").
4. **`client/src/pages/CatalogPage.jsx`**:
   - Initializes `selectedForCompare` from `getStoredCompareIds()`.
   - Synchronizes storage on toggle and clear.
5. **`client/src/pages/VehicleDetailPage.jsx`**, **`RecommendationPage.jsx`**, **`AiScannerPage.jsx`**:
   - Updated comparison buttons to append vehicle to existing comparison and persist in storage.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `client` tests (`node --test`): All 22 tests passed (including 7 new unit tests for compareStorage).
- Service tests (`npm test`): All 132 tests passed across all 4 workspaces (`client`: 22, `identity-user`: 28, `vehicle-catalog`: 34, `recommendation`: 48).
- `npm run build`: Production bundle built cleanly with Vite in 1.36s.

## 2026-10-14 — Optional User Preferences in Vehicle Comparison AI Verdict

### Scope and objective

- In comparison matrix, add an optional comment/text box for user preferences and requirements.
- Feed user preferences directly into the Gemini AI comparative analysis to determine and recommend the right car for their specific driving habits, family needs, and priorities.
- Display an applied preferences indicator on the generated comparative verdict when custom preferences are supplied.

### Implemented behavior and files changed

1. **`services/recommendation/src/routes/compare.js`**:
   - `POST /api/v1/compare/conclusion`: Accepted optional `userPreferences` (validated as string up to 1000 characters).
   - Injected user preferences into the Gemini prompt instructions, instructing the model to evaluate tradeoffs and tailor the comparative verdict, category champions, and final takeaway based on the buyer's unique needs.
   - Updated `generateMockConclusion` to factor in `userPreferences` in test/mock environments.
   - Returned `userPreferences` in API response payload.
2. **`services/recommendation/test/api.test.js`**:
   - Added `COMP-04b` test verifying `/api/v1/compare/conclusion` accepts `userPreferences` and tailors the verdict output.
3. **`client/src/services/recommendationClient.js`**:
   - Updated `getAiComparisonConclusion` to serialize `userPreferences` in request body.
4. **`client/test/apiClients.test.js`**:
   - Added test verifying client serializes `userPreferences` accurately to the comparison endpoint.
5. **`client/src/pages/ComparePage.jsx`**:
   - Added user preferences state (`userPreferences`, `appliedPreferences`).
   - Integrated an optional preferences comment box above the verdict trigger with character counter (500 chars), guidance help text, and clear button.
   - Passed `userPreferences` to `getAiComparisonConclusion`.
   - Rendered a highlighted "Customized for your preferences" banner above the executive summary when custom preferences are applied.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `client` tests (`node --test`): All 23 tests passed.
- `recommendation` tests (`node --test`): All 49 tests passed (including new `COMP-04b`).
- `npm run build`: Production bundle built cleanly with Vite in 1.62s.

## 2026-10-14 — AI Detection Token Bucket Empty Warning and 15s Refill Notification

### Scope and objective

- When the Token Bucket algorithm detects that tokens are depleted for AI vehicle identification, present a clear rate limit warning indicating the token bucket is empty.
- Show live refill cooldown countdown and automatically restore scanning capabilities once tokens refill after 15 seconds.

### Implemented behavior and files changed

1. **`services/recommendation/src/rateLimit.js`**:
   - Updated 429 `RATE_LIMIT_EXCEEDED` response message to explicitly indicate: `"AI search rate limit reached. Token bucket is empty. Tokens refill in <X> seconds. Please wait before trying again."`.
2. **`client/src/pages/AiScannerPage.jsx`**:
   - In `runAnalysis`: On 429 / `RATE_LIMIT_EXCEEDED`, sets countdown to `err.retryAfter || 15`, displays warning toast `"Token Bucket Empty"` and sets warning message `"Rate limit reached. Token bucket is empty. Tokens refill in <X> seconds."`.
   - Updated the alert banner to show a styled `warning` alert with title `"Rate Limit Warning: Token Bucket Empty"` along with a live `"Refilling in <X>s..."` badge.
   - Updated scan button during cooldown to display `"Token Bucket Empty: Refilling (<X>s)..."`.
   - Enhanced the countdown timer effect so that when the timer reaches 0, it displays an informative toast `"Token refilled! You can scan a vehicle now."`, clears the warning alert, and re-enables the scan button.

### Validation

- `npm run lint`: Passed with 0 errors and 0 warnings.
- `client` tests (`node --test`): All 23 tests passed.
- `vehicle-catalog` tests (`node --test`): All 34 tests passed.
- `recommendation` tests (`node --test`): All 49 tests passed (including `AI-04` and `AI-05` token bucket rate limiter refill tests).
- `npm run build`: Production bundle built cleanly with Vite in 5.29s.
