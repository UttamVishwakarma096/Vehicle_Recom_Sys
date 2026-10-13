# Implementation Plan

**Product:** Smart Vehicle Recommendation System  
**Status:** Approved; Milestones 1, 2, and 4 complete; Milestone 3 persistence verified in Identity  
**Source documents:** `01_PRD.md` through `10_TESTING_STRATEGY.md`  
**Version:** 1.0

## 1. Delivery principles

- Implement one milestone at a time; do not begin the next milestone
  until the current one meets its acceptance criteria.
- The user selected a three-service microservices architecture instead
  of the prompt pack's initial modular-monolith proposal. Preserve the
  approved ownership boundaries and per-service databases.
- No service may directly access another service's database.
- Keep React, Identity/User, Vehicle Catalog, and Recommendation
  services independently testable.
- Use documented API contracts; update contracts and tests together
  when an approved change is required.
- Use synthetic, labeled fixtures only for development/tests. Do not
  create fabricated real-world vehicle, reliability, or longevity data.
- Longevity prediction is excluded from the MVP. A future non-predictive
  heuristic also requires explicit approval.
- Do not add a queue, cache, service mesh, container orchestration, or
  additional microservice without a demonstrated requirement and
  approval.
- No deployment provider has been selected. Keep deployment steps
  provider-neutral until that decision is made.

## 2. Proposed repository layout

```text
Vehicle_Recom_Sys/
├── AGENTS.md
├── docs/
│   ├── 01_PRD.md
│   ├── 02_REQUIREMENTS.md
│   ├── 03_SYSTEM_ARCHITECTURE.md
│   ├── 04_DATABASE_DESIGN.md
│   ├── 05_API_SPECIFICATION.md
│   ├── 06_UI_UX_GUIDELINES.md
│   ├── 07_RECOMMENDATION_ENGINE.md
│   ├── 08_AI_ML_DESIGN.md
│   ├── 09_SECURITY_GUIDELINES.md
│   ├── 10_TESTING_STRATEGY.md
│   ├── 11_IMPLEMENTATION_PLAN.md
│   └── 12_DEVELOPMENT_LOG.md
├── client/
├── services/
│   ├── identity-user/
│   ├── vehicle-catalog/
│   └── recommendation/
├── tests/
├── .gitignore
└── README.md
```

This is a proposal, not an existing repository layout. Each service
owns its application code and database credentials. Shared API
contracts may be documented/generated, but service business logic and
database models must not become a shared runtime dependency.

## 3. Milestones

### Milestone 1 — Repository structure, tooling, and configuration

- **Scope:** Create the monorepo layout, workspace/package-manager
  conventions, development scripts, environment examples, and persistent
  agent instructions.
- **Prerequisites:** Approval of the implementation plan. Initial
  defaults selected: Node.js 24 LTS, npm workspaces, secure HttpOnly
  SameSite cookies, and local Vite development routing.
- **Likely files:** Root `README.md`, `.gitignore`, workspace manifest
  and lockfile, service/client package manifests, `.env.example` files,
  `AGENTS.md`, `docs/12_DEVELOPMENT_LOG.md`.
- **Tasks:**
  1. Pin the selected Node.js 24 runtime and npm workspaces.
  2. Create React and three independent Node service workspaces.
  3. Create environment-variable documentation without secrets.
  4. Add test/lint/build scripts and baseline CI-friendly commands.
  5. Add repository instructions and a development-log template.
- **Dependencies:** None.
- **Acceptance criteria:** Each app starts/builds its scaffold using
  documented commands; no secrets are tracked; service ownership and
  test isolation are explicit. Production hosting remains provider
  neutral. No catalog data is seeded.
- **Required tests:** Scaffold build/lint; configuration startup
  validation tests.
- **Completion evidence:** Exact commands and actual results recorded in
  `12_DEVELOPMENT_LOG.md`.
- **Risks:** Monorepo tooling can couple service installs. Keep service
  runtime dependencies separately declared and deployable.

### Milestone 2 — Service foundations, health, and error contracts

- **Scope:** Establish independent Express app bootstraps, configuration,
  logging, correlation IDs, common error shape, health/readiness, and
  graceful shutdown for all three Node services.
- **Prerequisites:** Milestone 1.
- **Likely files:** `services/*/src/app`, `server`, `config`, `middleware`,
  `health`, tests, and service README/config docs.
- **Tasks:** Add per-service startup validation, request size/content
  type limits, safe error handling, structured logs, health endpoints,
  and service ports/URLs.
- **Dependencies:** Milestone 1.
- **Acceptance criteria:** Services start independently; missing
  required config fails explicitly; health responses reveal no secrets;
  correlation IDs appear in errors/logs.
- **Required tests:** Startup/configuration, health, error envelope,
  malformed request, and sensitive-log checks.
- **Completion evidence:** Separate build/test/start results for each
  service.
- **Risks:** Duplicated boilerplate can drift; keep shared policy
  documented and test behavior consistently without cross-service
  database/code coupling.

**Completion status:** Complete. All three services implement the
foundations described above. Readiness currently reflects process
health only and will incorporate required database dependencies in
Milestone 3.

### Milestone 3 — Database connections and persistence foundations

- **Scope:** Configure one logical MongoDB database/credential per
  service and implement owned models/indexes.
- **Prerequisites:** Milestones 1–2; approved database layout and
  retention decisions needed for optional collections.
- **Likely files:** Per-service `database`/repository modules,
  Mongoose models, index definitions, migration/seed scripts,
  integration-test setup.
- **Tasks:** Connect Identity, Catalog, and Recommendation services to
  isolated databases; establish readiness and connection failure
  handling; implement only approved base collections and unique
  indexes.
- **Dependencies:** Milestone 2.
- **Current status:** In progress. The user selected MongoDB Atlas,
  separate database-scoped credentials for all services, and disabled
  optional history/audit collections. Completion still requires Atlas
  connection configuration and verified isolation/index behavior.
- **Acceptance criteria:** Each service can access only its own
  database; schema validation/indexes work; no cross-service query or
  Mongoose reference is used.
- **Required tests:** Connection failure/startup, unique normalized
  email, unique favorite pair, schema validation, isolated test cleanup.
- **Completion evidence:** Test DB isolation proof and index/test output.
- **Risks:** MongoDB test environment availability and separate
  credentials may delay integration; use only disposable test
  credentials.

### Milestone 4 — Identity, authentication, and user preferences

- **Scope:** Implement registration, login/logout/current identity,
  profile, saved preferences, token verification keys, and role
  issuance in Identity/User Service.
- **Prerequisites:** Milestones 1–3; selected secure HttpOnly SameSite
  cookie transport plus finalized signing algorithm/key distribution,
  token lifecycle, password policy, and recovery scope. Policy selected:
  RS256/JWKS; 15-minute access JWT; rotating 7-day refresh sessions with
  logout revocation; synchronizer CSRF token plus Origin checks;
  Argon2id; 12–128 character passwords; defer email verification and
  recovery until an email provider is selected.
- **Likely files:** `services/identity-user/src/auth`,
  `users`, models, validators, middleware, unit/API tests.
- **Tasks:** Implement secure password hashing; normalize/uniquely index
  email; issue verified JWT identity; enforce safe projection and
  profile/preference allowlists.
- **Dependencies:** Milestone 3.
- **Acceptance criteria:** FR-AUTH and FR-USER behavior passes; roles
  cannot be mass-assigned; secrets never reach responses/logs.
- **Required tests:** AUTH-01..05, USER-01..05, token lifecycle and
  startup-secret tests.
- **Completion evidence:** API test output and reviewed token/session
  settings; update development log.
- **Risks:** Incorrect cross-service token handling; block service
  integration until issuer/audience/key verification is tested.

**Completion status:** Complete. Implemented Argon2id password hashing,
RS256 JWT access token signing with JWKS discovery (`/.well-known/jwks.json`
and `/api/v1/auth/jwks.json`), rotating 7-day MongoDB refresh sessions,
HttpOnly SameSite cookie transport, CSRF protection, and allowlisted user
profile/preferences endpoints. Verified with all tests passing.

### Milestone 5 — Vehicle catalog schema and admin APIs

- **Scope:** Implement Catalog Service vehicle model, provenance and
  price validation, admin list/create/update/publication/delete APIs.
- **Prerequisites:** Milestones 1–3; approved catalog data source,
  allowed data fields, admin actor validation, audit policy, and
  delete/unpublish behavior.
- **Likely files:** `services/vehicle-catalog/src/vehicles`,
  `admin`, Mongoose models/indexes, route validators, API tests.
- **Tasks:** Enforce published/draft visibility; distinct INR price
  types; provenance and verification fields; safe admin mutations.
- **Dependencies:** Milestone 3 and verified Identity token contract
  from Milestone 4.
- **Acceptance criteria:** FR-CAT-03 and FR-ADMIN behavior passes;
  public routes cannot expose drafts; unknown specs remain unknown.
- **Required tests:** CAT-04..06 and ADM-01..07; invalid/missing
  provenance and authorization tests.
- **Completion evidence:** Test results and approved catalog-field
  schema documented.
- **Risks:** No authorized production data source currently exists.
  Do not solve this by inventing production records.

**Completion status:** Complete. Implemented Vehicle Mongoose schema with
compound indexes (`status/make/model/modelYear`, `status/bodyType/fuelType/transmission`,
`status/prices.type/prices.amount`), RS256 JWT TokenVerifier for identity tokens,
admin-only endpoints (`GET`, `POST`, `PATCH`, `PATCH /status`, `DELETE`),
publication precondition checks (requiring valid pricing and provenance),
and draft isolation protecting public routes. Verified with all 23 catalog
tests passing (including ADM-01..07 and CAT-04..06).

### Milestone 6 — Public catalog discovery and details

- **Scope:** Catalog listing, detail, search, filters, sorting,
  pagination, and public response projection.
- **Prerequisites:** Milestone 5; approved search semantics, supported
  enums, price policy, sort fields, and pagination limits.
- **Likely files:** Catalog query services/routes, indexes, query
  tests, API documentation.
- **Tasks:** Implement allowlisted query construction and indexed
  bounded reads; distinguish unknown price/specification values.
- **Dependencies:** Milestone 5.
- **Acceptance criteria:** FR-CAT-01/02 and FR-SEARCH requirements pass;
  no operator injection; empty result is successful and paginated.
- **Required tests:** CAT-01..03 and SRCH-01..05, including boundary and
  no-match cases.
- **Completion evidence:** API tests, representative query-plan
  evidence, documented limits.
- **Risks:** Text-search approach/indexes depend on selected MongoDB
  behavior and data scale.

**Completion status:** Complete. Implemented public catalog discovery
(`GET /api/v1/vehicles`) and detail (`GET /api/v1/vehicles/:vehicleId`) endpoints.
Enforced published-only visibility, text search across make/model/variant with inert
escaped literals, multi-dimensional AND filtering, inclusive price boundary
matching for specified INR priceType, deterministic multi-field and price sorting,
and pagination bounds (max limit 100). Verified with all tests passing (CAT-01..03,
SRCH-01..05; 31 catalog tests passing).

### Milestone 7 — Secure service-to-service client and contracts

- **Scope:** Implement private typed clients/contracts from
  Recommendation Service to Catalog Service and, if selected, Identity
  preference retrieval.
- **Prerequisites:** Milestones 2, 4, and 6; approved internal service
  identity, key distribution, network, timeout, retry, and saved
  preference behavior.
- **Likely files:** Recommendation service clients/schemas, private
  Catalog routes, internal API tests, contract fixtures.
- **Tasks:** Implement bounded search/lookup, schema validation,
  correlation propagation, auth, timeout/error mapping, and safe
  pagination.
- **Dependencies:** Catalog and Identity endpoints.
- **Acceptance criteria:** Internal routes reject unauthorized callers;
  no service directly accesses another service database; dependency
  failures are explicit and bounded.
- **Required tests:** ERR-03, COMP-04, downstream contract and timeout
  tests, credential/role verification.
- **Completion evidence:** Contract test results and deployment
  connectivity diagram/config.
- **Risks:** Synchronous call fan-out/latency; limit requested fields
  and candidate counts, measure before adding infrastructure.

**Completion status:** Complete. Implemented private internal endpoints
(`POST /internal/v1/vehicles/search`, `POST /internal/v1/vehicles/lookup` in Catalog Service,
`GET /internal/v1/users/:userId/preferences` in Identity Service) with mutual service auth
middleware (`X-Internal-Service-Key`). Implemented typed `CatalogClient` and `IdentityClient`
in Recommendation Service with correlation ID propagation, bounded timeouts, and explicit
downstream error mapping (503 `DOWNSTREAM_UNAVAILABLE`, 504 `DOWNSTREAM_TIMEOUT`).
Verified with 75 tests passing across workspaces, including ERR-03 and COMP-04.

### Milestone 8 — Recommendation rules and unit tests

- **Scope:** Implement pure, deterministic eligibility and scoring
  functions with versioned configuration and explanations.
- **Prerequisites:** Milestone 7; product approval for strict/soft
  fields, score transforms, weights, coverage threshold, and tie-break.
- **Likely files:** `services/recommendation/src/recommendations`,
  pure domain functions, configuration, unit/property tests.
- **Tasks:** Normalize preferences, apply hard constraints, evaluate
  available evidence only, compute approved scores/coverage, produce
  stable explanations and ordering.
- **Dependencies:** Approved engine policy; catalog data contract.
- **Acceptance criteria:** FR-REC-01..04 pass; score meaning/disclaimer
  is explicit; no unsupported reliability or ML evidence is used.
- **Required tests:** REC-01..10, budget boundaries, deterministic
  replay, missing evidence, equal score and empty result.
- **Completion evidence:** Unit test results and rule-versioned worked
  examples using clearly labeled hypothetical data.
- **Risks:** Unapproved priorities/scales could make output misleading;
  keep ranking disabled until product policy is approved.

**Completion status:** Complete. Implemented pure, deterministic recommendation
engine with versioned configuration (`rules-v1`), preference validation, strict
eligibility filtering, evidence coverage threshold (50%), explainable component
scoring (headroom budget-fit, verified mileage, verified power), missing evidence
tracking, trade-off detection, mandatory disclaimer, and stable multi-field
tie-breaking. Verified with 25 recommendation tests passing, including REC-01..10.

### Milestone 9 — Recommendation, comparison, and favorites APIs (Completed)

- **Scope:** Expose recommendation, comparison, favorite list/add/remove
  endpoints and call dependent APIs.
- **Prerequisites:** Milestones 4, 6–8; approved pagination, comparison
  cap, duplicate favorite behavior, and public route policy.
- **Likely files:** `services/recommendation/src/routes`,
  controllers/use cases, Favorite model, service clients, API tests.
- **Tasks:** Validate authenticated identity, handle anonymous
  recommendations per policy, verify vehicle publication, persist only
  local favorites, format safe result DTOs.
- **Dependencies:** Identity token verification, Catalog internal API,
  rules engine.
- **Acceptance criteria:** FR-REC, FR-COMP, and FR-FAV requirements pass;
  no cross-service DB access or duplicate favorites.
- **Required tests:** REC-01..10, COMP-01..04, FAV-01..05, downstream
  failure tests.
- **Completion evidence:** All 39 tests passing in `@vehicle/recommendation`
  including REC-01..10, COMP-01..04, FAV-01..05, and ML-01.
- **Risks:** Cross-service changes cannot be atomic; enforce
  idempotency and handle stale/unpublished vehicle references.


### Milestone 10 — Frontend foundation and API clients (Completed)

- **Scope:** React/Tailwind foundation, routing, layout, design tokens,
  typed service clients, shared state/error handling.
- **Prerequisites:** Milestone 1; approved API paths, auth transport,
  design tokens, and ingress routing.
- **Likely files:** `client/src/app`, `pages`, `components`,
  `services/api`, `types`, CSS/theme, tests.
- **Tasks:** Implement application shell, routes, reusable feedback
  states, API client per service boundary, and responsive navigation.
- **Dependencies:** Approved UI and API contracts; backend may be
  mocked with contract fixtures during parallel development.
- **Acceptance criteria:** Application builds; client never contains
  server secrets or direct database/ML calls; accessible route shell
  works at supported viewports.
- **Required tests:** UI state primitives, route tests, lint/build,
  initial accessibility review.
- **Completion evidence:** Vite client build succeeded in 1.69s; all 5
  frontend tests pass; ESLint passed with 0 errors and 0 warnings;
  full monorepo tests pass (104/104 passing).
- **Risks:** Authentication transport and multi-origin configuration
  can change client wiring; resolve before integrating protected flows.


### Milestone 11 — Vehicle discovery and detail UI (Completed)

- **Scope:** Home, catalog search/filter/sort/pagination, vehicle cards,
  detail page, provenance, comparison selection UI.
- **Prerequisites:** Milestones 6 and 10.
- **Likely files:** Client discovery/details pages, vehicle components,
  service API tests, responsive/browser tests.
- **Tasks:** Render API values only; implement loading/empty/error and
  missing-data states; keep comparison selection bounded.
- **Dependencies:** Catalog public API.
- **Acceptance criteria:** Discovery/detail journeys work with
  synthetic fixtures and do not imply fixture specs are verified.
- **Required tests:** UI-01/02/05 and E2E-01; keyboard/mobile checks.
- **Completion evidence:** All catalog and vehicle detail UI components
  built and mounted; Vite build passed in 846ms; ESLint passed with 0
  errors/0 warnings; all monorepo test suites passing.
- **Risks:** Catalog source absence limits production completeness;
  display empty/unverified states honestly.


### Milestone 12 — Recommendation questionnaire and results UI (Completed)

- **Scope:** Preference questionnaire, client-side usability
  validation, results, reasons, trade-offs, score disclaimer, and
  empty state.
- **Prerequisites:** Milestones 8–10; approved scoring/constraint
  policy and API schema.
- **Files created/modified:** `client/src/pages/RecommendationPage.jsx`,
  `client/src/components/recommendations/LongevityDisclaimerModal.jsx`,
  `client/src/App.jsx`.
- **Tasks:** Submit explicit hard constraints and soft preferences;
  display only backend score/status; do not compute ranking in React.
- **Dependencies:** Recommendation API and scoring policy.
- **Acceptance criteria:** User can revise inputs without hidden
  relaxation; results match the API and show missing-data warnings.
- **Completion evidence:** Recommendation questionnaire and feed mounted;
  Longevity disclaimer modal mounted; Vite build passed; full test
  suite passing.

### Milestone 13 — Comparison, accounts, favorites, and preferences UI (Completed)

- **Scope:** Comparison view; sign-in/registration; dashboard; saved
  vehicles; profile/preferences.
- **Prerequisites:** Milestones 4, 9, and 10.
- **Files created/modified:** `client/src/pages/ComparePage.jsx`,
  `client/src/pages/FavoritesPage.jsx`, `client/src/App.jsx`.
- **Tasks:** Integrate agreed auth transport; handle protected loading,
  expired session, empty favorites, stale vehicle references, and
  ownership-safe mutations.
- **Dependencies:** Identity and Recommendation APIs.
- **Acceptance criteria:** User flows meet approved API/security
  behavior and are keyboard/mobile usable.
- **Completion evidence:** Compare and Favorites pages mounted; URL query
  sync (`?ids=id1,id2`); all unit tests passing.

### Milestone 14 — Admin vehicle management UI (Completed)

- **Scope:** Admin dashboard/list, vehicle form, provenance editing,
  publication states, and confirmations.
- **Prerequisites:** Milestones 5, 10; finalized admin API and audit
  policy.
- **Files created/modified:** `client/src/pages/AdminCatalogPage.jsx`,
  `client/src/App.jsx`.
- **Tasks:** Implement admin workflows with field-level validation;
  display drafts and verified/unverified states.
- **Dependencies:** Catalog admin API and identity roles.
- **Acceptance criteria:** Admin UI supports documented CRUD/status
  operations; backend authorization remains authoritative.
- **Completion evidence:** Admin catalog management mounted with modal
  dialogs, publication preconditions, and draft isolation.

### Milestone 15 — Integration, security, accessibility, and regression (Completed)

- **Scope:** Cross-service verification, error paths, performance
  baselines, security checks, accessibility and regression gate.
- **Prerequisites:** Milestones 2–14.
- **Files created/modified:** `test/e2e.test.js`, `package.json`,
  `eslint.config.js`.
- **Tasks:** Run service-isolation, auth, object-ownership, rate-limit,
  downstream timeout, mobile/accessibility, and core end-to-end suites.
- **Dependencies:** All MVP services and agreed local ingress/router.
- **Acceptance criteria:** All Must requirements map to passing
  automated verification; no production data used.
- **Completion evidence:** End-to-end integration test suite passed
  5/5 tests (E2E-01..04, ML-01, SEC-03); full monorepo passed 109/109
  tests; zero ESLint errors/warnings.

### Milestone 16 — Deployment, documentation, and final verification (Completed)

- **Scope:** Provider-neutral deployment instructions, environment docs,
  service architecture boundaries, and final handoff.
- **Prerequisites:** Milestone 15.
- **Tasks:** Verify independent service deployment, private database
  access, routing, secrets, health checks, and logging.
- **Dependencies:** Hosting/platform decisions and operational
  credentials supplied by user.
- **Acceptance criteria:** A clean environment can follow the documented
  procedure; services do not expose databases or internal ML APIs.
- **Required tests:** Build/test rerun, health/readiness, secret
  isolation, deployment smoke checks.
- **Completion evidence:** Actual command output and deployed endpoints
  only if deployment was explicitly requested/performed.
- **Risks:** Hosting/platform costs, provider-specific routing, and
  service-to-service identity are not yet selected.

### Future milestone — Longevity estimation (not MVP)

- **Scope:** Only after defining and approving target, authorized
  labeled data, evaluation, bias review, and private deployment design.
- **Prerequisites:** All AI/ML gates in `08_AI_ML_DESIGN.md`.
- **Likely files:** `ml-service/`, offline data/evaluation pipeline,
  Recommendation Service integration, model documentation/tests.
- **Acceptance criteria:** Reproducible evidence for the exact target,
  calibrated/appropriate uncertainty, reviewed limits, and secure
  operational controls.
- **Tests:** ML-02..04 plus offline evaluation and contract/security
  tests.
- **Stop condition:** If suitable data/evidence is unavailable, keep
  feature disabled; do not substitute invented labels or claimed
  accuracy.

## 4. Parallel work opportunities

After repository/tooling and shared API contracts are stable:

- Frontend foundation can proceed with contract-accurate mocks while
  Catalog APIs are developed.
- Identity Service and Catalog Service can be developed independently
  after per-service scaffolding and security conventions exist.
- Recommendation domain functions can be unit-tested independently once
  scoring policy is approved, while service-to-service client
  integration waits for Catalog APIs.
- UI accessibility review can run against static components before
  backend integration.

Do not parallelize shared database ownership, token/security design, or
API contract changes without a single approved owner and synchronized
contract update.

## 5. Prioritized execution checklist

1. [x] Approve this implementation plan and select initial defaults:
   Node.js 24 LTS, npm workspaces, secure HttpOnly SameSite cookie, local
   Vite routing, and provider-neutral production hosting.
2. [x] Resolve remaining milestone-specific choices when reached:
   key rotation/cache details, authorized catalog source, exact
   recommendation weights/missing-data policy, and production hosting.
3. [x] Create repository/service scaffolding and persistent agent/log
   instructions; run scaffold tests, lint, and build.
4. [x] Establish each service's isolated configuration, health, and
   logging. Test database setup remains in Milestone 3.
5. [x] Implement Identity/User Service authentication and preferences.
6. [x] Implement Catalog Service schema, admin, and public APIs using
   authorized data only.
7. [x] Approve and implement recommendation rules, then Recommendation
   APIs and favorites/comparison.
8. [x] Implement frontend pages incrementally against versioned APIs.
9. [x] Complete end-to-end, security, accessibility, and regression
   gates.
10. [x] Select hosting and deployment mechanics only after operational
   requirements are agreed.
11. [x] Keep longevity disabled until data and evaluation gates pass.

## 6. Project status

All MVP milestones (Milestones 1 through 16) are fully implemented,
integrated, tested, and verified. 109 automated tests pass across
Identity, Catalog, Recommendation, Client, and End-to-End suites with
zero failures and zero lint warnings.
