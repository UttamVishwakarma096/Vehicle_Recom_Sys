# Functional and Non-Functional Requirements

**Product:** Smart Vehicle Recommendation System  
**Status:** Draft for review  
**Source:** `01_PRD.md`  
**Version:** 1.0

## 1. Conventions

- **Must / Should / Could** indicate delivery priority, not security
  strength.
- Acceptance criteria are intended to be verifiable by automated tests
  where practical.
- The API will use JSON. Exact paths and wire schemas belong in
  `05_API_SPECIFICATION.md`.
- “Published vehicle” means a catalog record an administrator has
  approved for user-facing discovery.
- A missing value is distinct from zero, false, or an empty string.
- Proposed numeric performance thresholds in this draft are targets for
  approval, not measured results.

## 2. Functional requirements

### 2.1 Authentication

#### FR-AUTH-01 — Register an account

- **Actor:** Visitor
- **Preconditions:** Registration is enabled.
- **Expected behavior:** Accept a valid email and password, validate
  them, store a password hash rather than the plaintext password, and
  create a regular user account.
- **Postconditions:** The account exists with a non-admin role. A
  duplicate normalized email does not create a second account.
- **Acceptance criteria:**
  - A valid registration creates one account and never returns the
    password or its hash.
  - Invalid email or password input is rejected with a field-level
    validation response.
  - Duplicate email registration returns a documented conflict without
    disclosing another user's data.
- **Priority:** Must
- **Dependencies:** NFR-SEC-01, NFR-DATA-01

#### FR-AUTH-02 — Authenticate an account

- **Actor:** Registered user or administrator
- **Preconditions:** Account exists and is permitted to authenticate.
- **Expected behavior:** Verify credentials and issue the configured
  authenticated session/token using the approved token-storage policy.
- **Postconditions:** A valid credential pair establishes the user
  identity; invalid credentials do not.
- **Acceptance criteria:**
  - Valid credentials authenticate the correct account.
  - Invalid credentials return a generic authentication error and do
    not reveal whether the email exists.
  - The response does not expose password material or signing secrets.
- **Priority:** Must
- **Dependencies:** FR-AUTH-01, NFR-SEC-02

#### FR-AUTH-03 — End an authenticated session

- **Actor:** Authenticated user
- **Preconditions:** User has an active session/token.
- **Expected behavior:** Invalidate or clear the session according to
  the selected authentication design.
- **Postconditions:** The logged-out credential cannot be used beyond
  the documented invalidation behavior.
- **Acceptance criteria:**
  - Logout produces the documented success response.
  - A credential invalidated by logout is rejected on a subsequent
    protected request.
- **Priority:** Must
- **Dependencies:** FR-AUTH-02, NFR-SEC-02

#### FR-AUTH-04 — Read current-user identity

- **Actor:** Authenticated user
- **Preconditions:** A valid authentication credential is provided.
- **Expected behavior:** Return only the authenticated user's approved
  profile and role information.
- **Postconditions:** No state changes.
- **Acceptance criteria:**
  - Missing, malformed, expired, or invalid credentials are rejected.
  - Returned identity is derived from a verified credential and
    server-side account, not a client-supplied user ID or role.
- **Priority:** Must
- **Dependencies:** FR-AUTH-02, FR-USER-01

### 2.2 Vehicle catalog, search, and details

#### FR-CAT-01 — List published vehicles

- **Actor:** Visitor or authenticated user
- **Preconditions:** Catalog service is available.
- **Expected behavior:** Return a paginated collection of published
  vehicles using supported query parameters.
- **Postconditions:** No state changes.
- **Acceptance criteria:**
  - Only published records are returned.
  - The response includes pagination metadata and does not load the
    entire catalog in one unbounded response.
  - Unsupported pagination values are rejected or normalized according
    to one documented API rule.
- **Priority:** Must
- **Dependencies:** FR-CAT-03, NFR-PERF-01

#### FR-CAT-02 — Read vehicle details

- **Actor:** Visitor or authenticated user
- **Preconditions:** A vehicle identifier is supplied.
- **Expected behavior:** Return the matching published vehicle with
  available specifications, price type, provenance, and verification
  metadata.
- **Postconditions:** No state changes.
- **Acceptance criteria:**
  - A valid existing identifier returns one detail record.
  - A malformed identifier returns a validation error; a well-formed
    but unknown identifier returns not found.
  - Unavailable, unknown, or unverified fields are distinguishable from
    measured zero or false values.
- **Priority:** Must
- **Dependencies:** FR-CAT-03, NFR-DATA-01

#### FR-CAT-03 — Validate vehicle catalog records

- **Actor:** System; administrator supplies record data
- **Preconditions:** A create or update operation is requested.
- **Expected behavior:** Validate required identity fields, supported
  field types, price amount/currency/type consistency, and permitted
  provenance fields.
- **Postconditions:** Only valid records are persisted; invalid records
  remain unchanged.
- **Acceptance criteria:**
  - Invalid data is rejected with field-specific errors.
  - Missing optional specifications remain missing; they are not
    replaced with invented values.
  - Ex-showroom, on-road, and used-vehicle prices remain distinct.
  - Catalog specifications are not confused with longevity labels,
    maintenance history, or mileage observations.
- **Priority:** Must
- **Dependencies:** FR-ADMIN-01, NFR-DATA-01

#### FR-SEARCH-01 — Search and filter catalog

- **Actor:** Visitor or authenticated user
- **Preconditions:** Catalog listing is available.
- **Expected behavior:** Apply supported text search, budget, brand,
  fuel, transmission, seating, body type, and other documented filters
  to published vehicles.
- **Postconditions:** No state changes.
- **Acceptance criteria:**
  - Multiple valid filters are combined with documented AND/OR
    semantics.
  - A price filter uses only a compatible currency and price type.
  - Vehicles with a missing filter field do not silently match that
    field's constraint.
  - Empty results return a successful empty collection and pagination
    metadata, not a server error.
  - Search values cannot alter the database query structure.
- **Priority:** Must
- **Dependencies:** FR-CAT-01, FR-CAT-03, NFR-SEC-03

#### FR-SEARCH-02 — Sort and paginate search results

- **Actor:** Visitor or authenticated user
- **Preconditions:** Search/filter request is valid.
- **Expected behavior:** Apply an explicitly supported sort order and
  bounded page size.
- **Postconditions:** No state changes.
- **Acceptance criteria:**
  - Unsupported sort fields/directions are rejected or use a documented
    default.
  - Results have a stable secondary ordering when primary values tie.
  - Page size cannot exceed the configured maximum.
- **Priority:** Must
- **Dependencies:** FR-SEARCH-01, NFR-PERF-01

### 2.3 Recommendation engine

#### FR-REC-01 — Submit recommendation preferences

- **Actor:** Visitor or authenticated user
- **Preconditions:** Recommendation service is available.
- **Expected behavior:** Accept and validate a preference object
  containing budget and supported vehicle, usage, and priority fields.
- **Postconditions:** No preference is saved unless the user explicitly
  chooses to save it.
- **Acceptance criteria:**
  - Numeric ranges, enumerated values, and required combinations are
    validated server-side.
  - Lower budget cannot exceed upper budget; non-positive or
    non-finite amounts are rejected.
  - Missing optional preferences are permitted and do not become
    invented defaults.
  - A request with insufficient mandatory preferences follows the
    documented partial-input behavior and identifies what is missing.
- **Priority:** Must
- **Dependencies:** FR-USER-02, NFR-SEC-03

#### FR-REC-02 — Filter eligible vehicles

- **Actor:** Recommendation service
- **Preconditions:** Preference request is valid.
- **Expected behavior:** Apply preferences marked mandatory to published
  catalog records before ranking.
- **Postconditions:** Only eligible vehicles are candidates for ranking.
- **Acceptance criteria:**
  - Mandatory versus optional filters follow the approved preference
    policy.
  - Budget boundaries are inclusive or exclusive according to the
    published rule; tests cover exact lower and upper boundaries.
  - Missing mandatory catalog data does not qualify as a match.
  - If no vehicles qualify, return a valid empty result with an
    explanation and no fallback that silently violates a mandatory
    constraint.
- **Priority:** Must
- **Dependencies:** FR-REC-01, FR-CAT-03

#### FR-REC-03 — Rank eligible vehicles deterministically

- **Actor:** Recommendation service
- **Preconditions:** Valid preferences and eligible candidates exist.
- **Expected behavior:** Calculate normalized component and overall
  match scores using approved, configurable weights.
- **Postconditions:** Each ranked vehicle has a score and stable rank.
- **Acceptance criteria:**
  - Weights are finite, non-negative, validated, and normalized using
    the documented algorithm.
  - Identical catalog snapshot, preferences, and weights produce
    identical component scores, total scores, and ordering.
  - Ties use the documented stable tie-break rule.
  - Missing evidence is not treated as a positive score.
  - A score is labeled a preference match score, not a probability,
    guarantee, or objective rating.
- **Priority:** Must
- **Dependencies:** FR-REC-02, NFR-REC-01

#### FR-REC-04 — Explain recommendation results

- **Actor:** Recommendation service
- **Preconditions:** Ranking has completed.
- **Expected behavior:** Return match reasons, trade-offs, relevant
  constraints, component scores where supported, and missing-data
  warnings with each result.
- **Postconditions:** No state changes.
- **Acceptance criteria:**
  - Explanations correspond to actual input preferences and available
    catalog evidence.
  - The response identifies important missing or unverified fields.
  - The client cannot submit an authoritative score to be echoed as a
    system result.
- **Priority:** Must
- **Dependencies:** FR-REC-03

### 2.4 Vehicle comparison

#### FR-COMP-01 — Compare selected vehicles

- **Actor:** Visitor or authenticated user
- **Preconditions:** At least two valid, published vehicle identifiers
  are supplied.
- **Expected behavior:** Return comparable fields in a consistent
  structure for each selected vehicle.
- **Postconditions:** No state changes.
- **Acceptance criteria:**
  - Duplicate identifiers are removed or rejected according to the
    documented API rule.
  - The selected count cannot exceed the configured comparison cap.
  - Missing values are explicitly represented and never substituted
    with fabricated data.
  - Invalid and unpublished vehicle identifiers produce the documented
    validation/not-found behavior.
- **Priority:** Must
- **Dependencies:** FR-CAT-02

### 2.5 Favorites

#### FR-FAV-01 — List and add saved vehicles

- **Actor:** Authenticated user
- **Preconditions:** A valid session exists; target vehicle is
  published.
- **Expected behavior:** List only the user's saved vehicles or add a
  vehicle to that user's saved collection.
- **Postconditions:** A successful add creates at most one favorite per
  user/vehicle pair.
- **Acceptance criteria:**
  - Unauthenticated access is rejected.
  - The server derives ownership from the verified identity.
  - Adding the same vehicle twice does not create duplicate records and
    returns the documented idempotent/conflict response.
  - A user cannot read or mutate another user's favorites.
- **Priority:** Must
- **Dependencies:** FR-AUTH-04, FR-CAT-02, NFR-SEC-04

#### FR-FAV-02 — Remove a saved vehicle

- **Actor:** Authenticated user
- **Preconditions:** Valid session and vehicle identifier.
- **Expected behavior:** Remove the matching favorite owned by the
  authenticated user.
- **Postconditions:** The user's matching favorite no longer exists.
- **Acceptance criteria:**
  - A user cannot remove another user's favorite.
  - Repeating a removal follows a documented idempotent/not-found
    behavior.
  - Invalid identifiers return a validation error.
- **Priority:** Must
- **Dependencies:** FR-FAV-01, NFR-SEC-04

### 2.6 User profile and preferences

#### FR-USER-01 — Read and update own profile

- **Actor:** Authenticated user
- **Preconditions:** Valid session.
- **Expected behavior:** Read or update only editable profile fields
  permitted by the approved user schema.
- **Postconditions:** Permitted changes are saved to the authenticated
  account only.
- **Acceptance criteria:**
  - Ownership is derived server-side.
  - Role, password hash, account identifiers, and other protected
    fields cannot be mass-assigned through profile updates.
  - Invalid field values are rejected.
- **Priority:** Must
- **Dependencies:** FR-AUTH-04, NFR-SEC-04

#### FR-USER-02 — Manage saved recommendation preferences

- **Actor:** Authenticated user
- **Preconditions:** Valid session.
- **Expected behavior:** Save, read, or update the user's validated
  recommendation preferences.
- **Postconditions:** Preferences belong only to that user.
- **Acceptance criteria:**
  - The same validation rules as FR-REC-01 apply.
  - A user can change or clear optional preferences.
  - Preferences are not silently used for a recommendation request
    unless the API behavior clearly indicates that saved preferences
    were selected.
- **Priority:** Must
- **Dependencies:** FR-AUTH-04, FR-REC-01, NFR-SEC-04

### 2.7 Administration

#### FR-ADMIN-01 — Create a vehicle

- **Actor:** Administrator
- **Preconditions:** Valid authenticated account with administrator
  role.
- **Expected behavior:** Validate and create a catalog record in an
  approved initial publication state.
- **Postconditions:** One valid record exists; it is not necessarily
  public until published.
- **Acceptance criteria:**
  - Missing required fields and invalid types are rejected.
  - Client-supplied role or ownership data cannot change authorization.
  - Provenance and verification fields follow their defined write
    permissions.
- **Priority:** Must
- **Dependencies:** FR-CAT-03, NFR-SEC-05

#### FR-ADMIN-02 — Update or remove a vehicle

- **Actor:** Administrator
- **Preconditions:** Valid authenticated administrator and valid
  vehicle identifier.
- **Expected behavior:** Update permitted catalog fields or remove/
  unpublish a record under the approved deletion policy.
- **Postconditions:** Changes are validated and visible according to
  publication rules; invalid changes do not partially persist.
- **Acceptance criteria:**
  - Non-administrators are rejected.
  - Invalid identifiers and unknown records receive distinct documented
    responses.
  - Protected fields cannot be overwritten through mass assignment.
  - Deletion behavior preserves required references or history according
    to the approved data-retention policy.
- **Priority:** Must
- **Dependencies:** FR-ADMIN-01, NFR-SEC-05

#### FR-ADMIN-03 — List and inspect managed vehicles

- **Actor:** Administrator
- **Preconditions:** Valid authenticated administrator.
- **Expected behavior:** Return paginated records, including
  publication and data-quality metadata needed for catalog maintenance.
- **Postconditions:** No state changes.
- **Acceptance criteria:**
  - Non-administrators cannot access the management view/API.
  - The result is paginated and can distinguish unpublished records.
  - Secrets and internal credentials are never returned.
- **Priority:** Must
- **Dependencies:** FR-ADMIN-01, NFR-SEC-05

### 2.8 Longevity or ownership suitability

#### FR-LONG-01 — Gate predictive longevity estimates on evidence

- **Actor:** System; user requests longevity information
- **Preconditions:** None for normal catalog usage.
- **Expected behavior:** Present an ML estimate only when an approved
  prediction target, suitable labeled data, validation results, bias
  review, and deployment approval exist.
- **Postconditions:** When prerequisites are absent, no result is
  represented as a prediction.
- **Acceptance criteria:**
  - With no approved model evidence, the system returns a clear
    unavailable/not-enabled state or an approved non-predictive
    suitability result.
  - Any estimate identifies its target, relevant limitations, and
    uncertainty supported by evaluation.
  - The system does not claim a lifespan or major-repair probability
    without a model validated for that exact target.
- **Priority:** Could
- **Dependencies:** FR-LONG-02, NFR-ML-01

#### FR-LONG-02 — Provide an explicitly non-predictive fallback

- **Actor:** System
- **Preconditions:** Predictive model is not approved; product approval
  has selected the heuristic fallback.
- **Expected behavior:** Calculate a documented suitability score only
  from supported inputs and rules.
- **Postconditions:** Output remains labeled heuristic/non-predictive.
- **Acceptance criteria:**
  - The score lists evidence and missing inputs used.
  - The UI and API do not label it “AI prediction,” “lifespan,” or a
    probability of failure.
  - The feature can be omitted if the heuristic policy is not approved.
- **Priority:** Could
- **Dependencies:** FR-REC-04, FR-LONG-01

### 2.9 Error handling and recommendation history

#### FR-ERR-01 — Return consistent safe errors

- **Actor:** System
- **Preconditions:** A request fails validation, authorization, lookup,
  or downstream processing.
- **Expected behavior:** Return a consistent error shape and
  appropriate status without exposing secrets, stack traces, or
  sensitive database details.
- **Postconditions:** Failure is logged with a correlation identifier
  where appropriate; credentials and unnecessary personal data are not
  logged.
- **Acceptance criteria:**
  - Validation errors identify the invalid field where safe.
  - Authentication, authorization, not-found, conflict, rate-limit, and
    server errors are distinguishable by documented status/type.
  - Error responses contain no stack trace, secret, password, or raw
    database exception.
- **Priority:** Must
- **Dependencies:** NFR-SEC-06, NFR-OBS-01

#### FR-HIST-01 — Store recommendation history

- **Actor:** Authenticated user
- **Preconditions:** User explicitly requests a recommendation and
  history retention is approved.
- **Expected behavior:** Store only the approved request/result
  attributes with owner and timestamp, subject to the retention policy.
- **Postconditions:** The history is available only to its owner and can
  be deleted under the approved policy.
- **Acceptance criteria:**
  - No history is stored if the feature is disabled or consent/policy
    requirements are unmet.
  - A user cannot view another user's history.
  - Retention and deletion behavior are tested.
- **Priority:** Could
- **Dependencies:** FR-REC-01, FR-AUTH-04, NFR-PRIV-01

## 3. Validation rules and expected behavior

| Input or condition | Validation / behavior | Expected outcome |
|---|---|---|
| Missing recommendation preferences | Accept only if the remaining fields meet the approved minimum; otherwise identify required fields. Never invent defaults. | Field-level validation or a documented partial-input response. |
| Missing optional preference | Do not use it as an eligibility condition or fabricate its value. | Continue if mandatory inputs are valid; disclose that ranking omits that factor where relevant. |
| Budget lower bound exceeds upper bound | Reject. | Client validation feedback and server-side validation error. |
| Negative, non-finite, malformed budget | Reject; require supported currency and compatible price type. | Validation error; no query or write using the invalid value. |
| Exact budget boundary | Apply the approved inclusive/exclusive rule consistently. | Boundary tests verify exact minimum and maximum cases. |
| No matching vehicles | Return an empty result; do not silently relax mandatory filters. | Success response with empty items and a helpful message. |
| Vehicle missing a specification | Preserve as missing/unknown. Do not treat as a positive match. | Detail, comparison, and recommendation output shows missing-data state. |
| Malformed vehicle ID | Validate format before database lookup. | Client error; no database cast exception leaked. |
| Well-formed but nonexistent/unpublished ID | Apply endpoint publication/authorization rules. | Not-found response for public access; no internal record disclosure. |
| Unauthenticated protected request | Require valid authentication. | Unauthorized response; no protected data returned. |
| Authenticated non-admin requests admin operation | Enforce role check server-side. | Forbidden response; no record change. |
| Invalid/expired authentication token | Reject; never trust unverified claims. | Unauthorized response. |
| ML service timeout/unavailable | Bound the call; do not block core catalog behavior. | Documented unavailable/fallback response; no fabricated prediction. |
| Invalid ML request/response | Validate at both Node service boundary and ML service boundary. | Reject safely, record non-sensitive diagnostic, return documented service error. |
| Duplicate favorite | Enforce uniqueness for user/vehicle pair. | One favorite maximum; operation follows documented idempotent/conflict behavior. |
| Duplicate comparison IDs | Normalize or reject according to one documented policy. | Stable result with no duplicate comparison column, or validation error. |
| Invalid pagination/sort | Enforce limits and supported sort fields. | Documented validation/default behavior; bounded database operation. |
| Client submits `role`, owner ID, score, or protected fields | Ignore only where explicitly documented; otherwise reject. Never treat as authoritative. | No privilege escalation or protected-field mutation. |

## 4. Non-functional requirements

### Security and privacy

#### NFR-SEC-01 — Password storage

Passwords must be stored only as salted, adaptive one-way hashes using
an approved password hashing implementation. Tests must verify that
plaintext passwords and hashes are never serialized in API responses.

#### NFR-SEC-02 — Authentication credential handling

The application must use the token/session storage and transport policy
approved in the architecture/security design. Signing secrets must be
server-side only. Expiry, logout, and invalid-token behavior must be
documented and tested.

#### NFR-SEC-03 — Input and query safety

All external inputs must be validated on the server. Database queries
must use typed/allowlisted fields and safe query construction. Tests
must cover malformed values and injection-shaped strings.

#### NFR-SEC-04 — Ownership enforcement

The server must authorize every read/write of user profiles,
preferences, favorites, and history against the verified account
identity. Tests must attempt cross-user access for every owned resource.

#### NFR-SEC-05 — Administrator authorization

Every administrator operation must enforce the role using server-side
account data or verified claims. Client-supplied role values must never
grant access. Tests must cover anonymous, regular-user, and
administrator roles.

#### NFR-SEC-06 — Safe errors and rate limits

Errors must not expose secrets, stack traces, or sensitive internals.
Authentication and computationally expensive endpoints must have
documented rate limits before public deployment; limit behavior must be
tested.

#### NFR-PRIV-01 — Data minimization and retention

Collect only fields required by approved features. Document purpose,
retention, deletion, and access for account and optional recommendation
history data before production deployment. Avoid personal data in
operational logs.

### Data integrity and recommendation quality

#### NFR-DATA-01 — Catalog consistency

Catalog schemas must distinguish price type/currency, known versus
missing specifications, data provenance, verification timestamps,
maintenance data, observations, and model outcome labels. Invalid
records must fail atomically without partial writes.

#### NFR-REC-01 — Reproducible ranking

The rule-based engine must produce deterministic scores and order for
identical versioned inputs and catalog data. The implementation must
identify its scoring-rule version so results can be reproduced during
testing.

#### NFR-ML-01 — Evidence-based predictive output

No predictive longevity functionality may be enabled until a target,
data source, label quality, representative evaluation, leakage
prevention, bias assessment, and limitations have been documented and
approved. Model performance must not be invented or inferred from
synthetic fixtures.

### Performance, reliability, and scale

#### NFR-PERF-01 — Bounded catalog operations

Catalog and administration lists must be paginated with a server-side
maximum page size. Proposed initial target for approval: p95 response
time under 1 second for catalog list/detail and under 2 seconds for
rule-based recommendations at the agreed demonstration dataset size,
excluding cold start and external services.

#### NFR-REL-01 — Optional service failure isolation

Failure or timeout of an optional ML service must not make catalog,
search, details, comparison, favorites, or rule-based recommendations
unavailable. The configured ML request timeout and fallback/error
behavior must be covered by tests.

#### NFR-REL-02 — Data-write integrity

Mutations must validate before persistence and must not leave partial
records after validation or database failure. Duplicate user/favorite
constraints must be enforced at the persistence layer as well as in
request handling.

### Accessibility and usability

#### NFR-UX-01 — Responsive presentation

Core discovery, details, recommendation, comparison, account, and
administration flows must be usable at mobile, tablet, and desktop
viewport sizes. Layout tests or a documented manual test matrix must
cover those viewports.

#### NFR-A11Y-01 — Accessibility

Target WCAG 2.1 AA practices. Forms must have associated labels and
accessible error text; interactive controls must be keyboard-operable
with visible focus; semantic structure and color contrast must be
reviewed. Record automated and manual test evidence.

#### NFR-UX-02 — Explicit states

Every data-driven screen must have loading, empty, recoverable error,
and success states. Tests must verify these states for catalog,
recommendation, favorites, and comparison flows.

### Maintainability, testing, and operations

#### NFR-MAINT-01 — Modular boundaries

Frontend presentation, API calls, backend domain modules, persistence,
and optional ML integration must have clear responsibilities and
documented interfaces. Database access and secret-bearing operations
must remain on the backend.

#### NFR-TEST-01 — Testability

Each Must-priority functional requirement must map to at least one
automated test or, where automation is infeasible, a repeatable manual
test with recorded evidence. Tests must use isolated test data and a
test database, never production data.

#### NFR-OBS-01 — Logging and diagnostics

Operational logs must include enough context to diagnose failures
without recording passwords, tokens, secrets, or unnecessary personal
data. Correlation identifiers should connect a client-safe error to a
server-side event.

#### NFR-CONFIG-01 — Environment configuration

Environment-specific configuration and secrets must be external to
source code and frontend bundles. Startup must fail clearly when a
required server secret or database setting is absent or invalid.

#### NFR-DEP-01 — Reproducible setup

The repository must document supported runtime versions, dependency
installation, configuration, test, and startup commands. Lockfiles
must be maintained for supported package managers.

## 5. Cross-cutting error response contract

The API specification must define one JSON error envelope that includes
a stable machine-readable code, a safe user-facing message, optional
field errors, and a correlation identifier where appropriate. Status
codes must distinguish validation, unauthenticated, unauthorized,
conflict, not found, rate limiting, downstream unavailability, and
unexpected server failure. Stack traces and raw driver errors are never
client-facing.

## 6. Ambiguities, contradictions, and external dependencies

1. **Market and catalog scope:** INR is required by the database prompt,
   but the supported region, makes/models/years, authorized data source,
   and refresh cadence remain undecided.
2. **Price semantics:** Search and recommendations need a chosen
   comparable price type (e.g. ex-showroom versus on-road) and policy
   for optional used-vehicle data.
3. **Mandatory preferences:** The PRD lists candidate preference inputs
   but does not say which are strict eligibility conditions versus
   ranking signals. This affects user experience and scores.
4. **Scoring weights and scales:** Normalization, default weights,
   priority-to-weight mapping, missing-data penalty, and tie-break
   policy must be approved and documented before implementation.
5. **Comparison cap:** The maximum number of vehicles is not set.
6. **Authentication transport:** Secure HttpOnly SameSite cookie
   transport is selected. CSRF policy, expiry, refresh, revocation, and
   public-key rotation details remain to be specified during
   authentication implementation.
7. **Profile and privacy:** Editable profile fields, account deletion,
   data retention, consent, and recommendation history policy are not
   settled.
8. **Longevity:** No labeled data, target, or performance evidence is
   available. Predictive output cannot be implemented as an asserted
   capability until those dependencies are satisfied.
9. **Heuristic fallback:** Longevity functionality is omitted from the
   MVP; adding a non-predictive suitability score later requires
   separate product approval.
10. **Latency targets:** Proposed p95 values require confirmation against
    the selected deployment and dataset size.
11. **Production security and legal review:** CORS origins, jurisdiction,
    privacy obligations, and operational policies depend on deployment
    context.

There is no direct contradiction between the approved PRD and these
requirements. Requirements intentionally preserve its constraints:
never invent vehicle data, never call a match score a probability, and
do not enable longevity prediction without evidence.

## 7. Review gate

Approve or revise the validation policies and unresolved decisions
before producing the system architecture and database design. The
catalog data source, score policy, comparison cap, authentication
transport, and longevity fallback are implementation dependencies.
