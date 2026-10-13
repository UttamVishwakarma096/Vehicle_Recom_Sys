# Testing Strategy

**Product:** Smart Vehicle Recommendation System  
**Status:** Draft for review  
**Source documents:** `01_PRD.md` through `09_SECURITY_GUIDELINES.md`  
**Version:** 1.0

## 1. Testing objectives

- Verify approved requirements and service contracts, not just code
  coverage.
- Test each microservice independently and test cross-service behavior
  through APIs.
- Use isolated synthetic test data and dedicated test databases.
- Never run destructive tests against production.
- Do not label synthetic fixtures as real vehicle data or training
  evidence.
- Report only test results that were actually executed.

## 2. Proposed test layers and tooling

Final tools depend on the project manifests created in implementation.
No dependency is installed by this strategy.

| Layer | Scope | Candidate tools |
|---|---|---|
| Unit | Pure validation, recommendation scoring, error mapping | Vitest/Jest for Node/React; pytest for Python if ML service is enabled |
| Service/API integration | Routes, middleware, persistence, indexes, auth/authorization | Supertest or equivalent HTTP test client with a dedicated MongoDB test database |
| Contract | Public and private service request/response compatibility | Schema/contract tests; exact framework selected during setup |
| Frontend component | Forms, state, accessibility labels, loading/error states | React Testing Library and Vitest/Jest |
| End-to-end | Core user journeys across deployed/local services | Playwright or equivalent browser automation after app startup |
| Security | Authentication, roles, ownership, injection-shaped inputs, rate limits | Automated API tests plus manual configuration review |
| Performance | Bounded catalog search and recommendations | Repeatable load/smoke tool selected during implementation; only against isolated environments |
| ML (optional) | Input validation, model artifact, target/response, failure behavior | pytest and approved offline evaluation scripts; omitted while ML is disabled |

## 3. Test data and environments

- Maintain separate development, automated-test, staging, and
  production configuration.
- Automated tests use isolated MongoDB databases/collections per
  service. A local disposable database or test-managed MongoDB instance
  may be selected during setup.
- Never point tests at production credentials, URLs, or data.
- Seed only clearly marked synthetic fixtures with no claim of verified
  vehicle attributes.
- Reset test state deterministically between tests or use unique test
  namespaces.
- Mock only external service boundaries in unit tests. Run integration
  tests with service APIs and database constraints for critical flows.
- Test real inter-service contracts and timeouts in integration tests;
  do not make every test depend on all services being online.
- ML evaluation data is not fabricated. While no approved model exists,
  the ML feature-disabled response is tested instead.

## 4. Requirement-to-test coverage

| Requirement | Primary tests |
|---|---|
| FR-AUTH-01..04 | AUTH-01 through AUTH-05 |
| FR-CAT-01..03 | CAT-01 through CAT-06 |
| FR-SEARCH-01..02 | SRCH-01 through SRCH-05 |
| FR-REC-01..04 | REC-01 through REC-10 |
| FR-COMP-01 | COMP-01 through COMP-04 |
| FR-FAV-01..02 | FAV-01 through FAV-05 |
| FR-USER-01..02 | USER-01 through USER-05 |
| FR-ADMIN-01..03 | ADM-01 through ADM-07 |
| FR-LONG-01..02 | ML-01 through ML-04 (disabled by default) |
| FR-ERR-01 | ERR-01 through ERR-04 |
| FR-HIST-01 | HIST-01 through HIST-03, only if history is approved |

## 5. Detailed functional and API test cases

### Authentication and users

| Test ID | Requirement | Preconditions | Inputs / steps | Expected result | Priority | Automation |
|---|---|---|---|---|---|---|
| AUTH-01 | FR-AUTH-01 | Identity test DB is isolated and empty | Register valid email/password | One regular account is created; response omits password/hash | Must | Yes, API integration |
| AUTH-02 | FR-AUTH-01 | Existing normalized email | Register same email with different case | Conflict response; no second account or account data disclosure | Must | Yes |
| AUTH-03 | FR-AUTH-02 | Registered account exists | Login with valid and invalid credentials | Valid credentials establish session; invalid credentials return generic 401 | Must | Yes |
| AUTH-04 | FR-AUTH-03/04 | Auth flow configured | Test missing, malformed, expired, wrong issuer/audience, invalid signature; logout then reuse credential | Invalid credentials are rejected; logout behavior follows selected policy | Must | Yes |
| AUTH-05 | FR-USER-01 | Two accounts and valid credentials | User A requests/patches own and User B profile by ID substitution | Own profile works; cross-user access denied; protected fields cannot change | Must | Yes |
| USER-01 | FR-USER-02 | User has valid session | Read empty preferences | `200` with empty preferences; no hidden defaults | Must | Yes |
| USER-02 | FR-USER-02 | User has valid session | Save valid preferences | Preferences persist and are returned for that user only | Must | Yes |
| USER-03 | FR-USER-02 | User has valid session | Save reversed budget or invalid enum/priority | `400` field validation; no write | Must | Yes |
| USER-04 | FR-USER-02 | Two users | Attempt to read or update the other user's preferences | Denied; no cross-user data | Must | Yes |
| USER-05 | FR-USER-01/02 | User has valid session | Submit `role`, `_id`, `passwordHash`, or unknown fields | Protected mutation is rejected; account unchanged | Must | Yes |

### Catalog, search, and vehicle details

| Test ID | Requirement | Preconditions | Inputs / steps | Expected result | Priority | Automation |
|---|---|---|---|---|---|---|
| CAT-01 | FR-CAT-01 | Test catalog has published and draft records | List vehicles | Only published records returned; response is paginated | Must | Yes |
| CAT-02 | FR-CAT-02 | Published test record exists | Fetch valid ID | Supported fields, price type, provenance, and missing values represented correctly | Must | Yes |
| CAT-03 | FR-CAT-02 | Catalog test DB isolated | Request malformed ID and well-formed unknown ID | Malformed ID gets 400; unknown/unpublished ID gets safe 404; no cast error leak | Must | Yes |
| CAT-04 | FR-CAT-03 | Admin API available | Create catalog record with missing required or invalid price fields | Validation error and no partial record | Must | Yes |
| CAT-05 | FR-CAT-03 | Test catalog fixture has missing specs | Read details | Missing/unknown is not converted to zero or a guessed value | Must | Yes |
| CAT-06 | FR-CAT-03 | Test fixture has price entries | Read record with ex-showroom/on-road/used fields | Price types remain distinct; currency/amount validation holds | Must | Yes |
| SRCH-01 | FR-SEARCH-01 | Published synthetic records cover test categories | Search by `q`, make, type, fuel, transmission, seats | Only expected published records match | Must | Yes |
| SRCH-02 | FR-SEARCH-01 | Test records include compatible/incompatible/missing prices | Apply min/max and `priceType` | Correct price type and inclusive boundary policy applied | Must | Yes |
| SRCH-03 | FR-SEARCH-01 | Catalog contains no matching fixture | Search valid unmatched filters | `200` with empty list and pagination metadata | Must | Yes |
| SRCH-04 | FR-SEARCH-01 | Service is running | Submit Mongo operator-shaped strings and invalid enums | Rejected or treated as inert text; query structure cannot be altered | Must | Yes |
| SRCH-05 | FR-SEARCH-02 | More than one result; sort ties available | Test page boundaries, limit > max, unsupported sort | Bounded result; stable ordering; documented invalid/default behavior | Must | Yes |

### Recommendation engine

| Test ID | Requirement | Preconditions | Inputs / steps | Expected result | Priority | Automation |
|---|---|---|---|---|---|---|
| REC-01 | FR-REC-01 | Recommendation service test DB/API available | Submit valid hard/soft preference request | Input is normalized and valid; no persistence unless explicitly selected | Must | Yes |
| REC-02 | FR-REC-01 | Service available | Submit missing mandatory fields, negative/non-finite amounts, min > max, invalid priority | Field-specific 400; no ranking/database mutation | Must | Yes |
| REC-03 | FR-REC-02 | Catalog test API returns candidates | Test exact min/max, one below/above, wrong price type | Approved budget boundary semantics are applied exactly | Must | Yes |
| REC-04 | FR-REC-02 | Candidate has missing strict fuel/seating/type | Request that field as mandatory | Candidate is ineligible; missing reason shown; no inferred value | Must | Yes |
| REC-05 | FR-REC-02 | One hard mismatch and one soft mismatch candidate | Request explicit strict/soft constraints | Hard mismatch excluded; soft mismatch remains eligible if policy allows | Must | Yes |
| REC-06 | FR-REC-03 | Fixed catalog response, rule config, and request | Repeat identical recommendation request | Same eligibility, component score, aggregate, and order; same rule version | Must | Yes |
| REC-07 | FR-REC-03 | Equal-score synthetic candidates | Request recommendation repeatedly | Stable approved tie-break order | Must | Yes |
| REC-08 | FR-REC-03/04 | Missing factors and varied evidence coverage | Test above/at/below approved coverage threshold | Score visibility and “insufficient data” behavior match approved policy | Must | Yes |
| REC-09 | FR-REC-04 | Candidate includes conflicting or missing evidence | Generate explanations | Every reason/trade-off maps to evaluated preference and evidence; disclaimer present | Must | Yes |
| REC-10 | FR-REC-02 | Catalog returns no eligible candidate | Request with hard constraints | Empty success response; hard constraints are not silently relaxed | Must | Yes |

### Comparison and favorites

| Test ID | Requirement | Preconditions | Inputs / steps | Expected result | Priority | Automation |
|---|---|---|---|---|---|---|
| COMP-01 | FR-COMP-01 | Two published synthetic vehicles | Compare both | Stable common rows; missing values represented consistently | Must | Yes |
| COMP-02 | FR-COMP-01 | API comparison cap configured | Submit below-minimum and above-cap counts | Validation matches approved bounds; no unbounded downstream request | Must | Yes |
| COMP-03 | FR-COMP-01 | One malformed and one unavailable ID | Compare IDs | Safe 400/404 behavior; hidden catalog details are not disclosed | Must | Yes |
| COMP-04 | FR-COMP-01 | Catalog Service intentionally unavailable | Compare known IDs | Bounded timeout and explicit downstream unavailable response | Must | Yes |
| FAV-01 | FR-FAV-01 | User and published test vehicle exist | Add favorite | Favorite belongs to authenticated subject | Must | Yes |
| FAV-02 | FR-FAV-01 | Favorite already exists | Add same vehicle twice | Unique index prevents duplicate; endpoint follows approved idempotent behavior | Must | Yes |
| FAV-03 | FR-FAV-01/02 | Two test users; favorite owned by A | B lists/removes A's favorite via ID substitution | No unauthorized read or mutation | Must | Yes |
| FAV-04 | FR-FAV-01 | Anonymous caller | List/add favorite | `401`; no records returned/created | Must | Yes |
| FAV-05 | FR-FAV-02 | User has favorite | Remove once and repeat | Favorite removed; repeat uses documented idempotent response | Must | Yes |

### Administration

| Test ID | Requirement | Preconditions | Inputs / steps | Expected result | Priority | Automation |
|---|---|---|---|---|---|---|
| ADM-01 | FR-ADMIN-01 | No credential | Create vehicle | `401`; no database mutation | Must | Yes |
| ADM-02 | FR-ADMIN-01 | Regular-user credential | Create/update/publish vehicle | `403`; no database mutation | Must | Yes |
| ADM-03 | FR-ADMIN-01 | Admin credential | Create valid synthetic draft record | `201`; actor derives from verified identity | Must | Yes |
| ADM-04 | FR-ADMIN-01/02 | Admin credential | Submit invalid fields or unknown/protected keys | Validation error; no partial/protected mutation | Must | Yes |
| ADM-05 | FR-ADMIN-02 | Admin credential; draft record | Publish with valid required data, then with missing provenance | Valid transition succeeds; invalid precondition is rejected | Must | Yes |
| ADM-06 | FR-ADMIN-02 | Admin credential; existing record | Unpublish/delete according to configured policy | Approved lifecycle occurs; references are handled safely | Must | Yes |
| ADM-07 | FR-ADMIN-03 | Admin and regular accounts | List management records | Admin sees paginated draft/published data; regular user denied | Must | Yes |

### Longevity and error handling

| Test ID | Requirement | Preconditions | Inputs / steps | Expected result | Priority | Automation |
|---|---|---|---|---|---|---|
| ML-01 | FR-LONG-01 | MVP ML feature is disabled | Call longevity endpoint | Documented feature-not-enabled response; no prediction-shaped fallback | Must | Yes |
| ML-02 | FR-LONG-01 | Approved test model eventually exists | Send valid schema to private test ML service | Response matches approved target/model schema; no claim outside test evidence | Could | Yes, only if enabled |
| ML-03 | FR-LONG-01 | Test ML service delayed | Request estimate through Recommendation Service | Configured timeout; safe unavailable response; core endpoints remain healthy | Must | Yes |
| ML-04 | FR-LONG-01/02 | Malformed model response or invalid input | Call endpoint/service boundary | Rejected safely; no unvalidated output reaches browser | Must | Yes |
| ERR-01 | FR-ERR-01 | All services available | Trigger validation, auth, not-found, conflict, rate-limit errors | Common envelope/code/status; no stack trace or internal exception | Must | Yes |
| ERR-02 | FR-ERR-01 | Service logs available in test | Trigger safe failure | Correlation ID links error/log; no token/password/secret is logged | Must | Yes |
| ERR-03 | FR-ERR-01 | Internal route enabled in isolated test | Call without service identity and with invalid service identity | Rejected; no internal data returned | Must | Yes |
| ERR-04 | FR-ERR-01 | Service rate limits configured | Exceed documented test threshold | `429` with safe retry guidance; no service instability | Must | Yes |

### Optional recommendation history

| Test ID | Requirement | Preconditions | Inputs / steps | Expected result | Priority | Automation |
|---|---|---|---|---|---|---|
| HIST-01 | FR-HIST-01 | History disabled (default) | Submit recommendation | No history record is persisted | Could | Yes |
| HIST-02 | FR-HIST-01 | History approved and enabled in test | Authenticated user submits and lists history | Only owner's records returned; rule version preserved | Could | Yes, only if enabled |
| HIST-03 | FR-HIST-01 | Retention policy configured in test | Delete account/history or advance TTL fixture | Approved deletion/expiry behavior is verified | Could | Yes, only if enabled |

## 6. Frontend component and end-to-end tests

| Test ID | Related requirements | Preconditions / actions | Expected result | Priority | Automation |
|---|---|---|---|---|---|
| UI-01 | FR-CAT-01, NFR-UX-02 | Render discovery with loading, data, empty, and error API states | Each state is understandable; retry is safe and contextual | Must | Component |
| UI-02 | FR-CAT-02, NFR-DATA-01 | Render record with unknown/unverified fields | Missing values are explicitly labeled, never shown as zero/default | Must | Component |
| UI-03 | FR-REC-01, NFR-A11Y-01 | Submit invalid questionnaire and correct it by keyboard | Labels, errors, focus, and values remain accessible | Must | Component/E2E |
| UI-04 | FR-REC-04 | Render result with score, trade-offs, and missing data | Score disclaimer and explanation appear; UI does not recalculate score | Must | Component |
| UI-05 | FR-COMP-01 | Compare at mobile/tablet/desktop viewports | Data remains readable; horizontal behavior is contained and keyboard-operable | Must | Browser |
| UI-06 | FR-AUTH-01..04 | Login/register/logout failures and success | Generic login failure, no secret display, clear session state | Must | Component/E2E |
| UI-07 | FR-FAV-01..02 | Add/remove favorite and API failure | Status is announced; duplicate/network failure behaves per API | Must | Component/E2E |
| UI-08 | FR-ADMIN-01..03 | Admin routes with admin and regular identity | UI shows correct navigation; server still enforces route authorization | Must | E2E/API |
| UI-09 | FR-LONG-01 | ML disabled | Predictive control is hidden or explicitly unavailable; no fake prediction shown | Must | Component |
| UI-10 | NFR-A11Y-01 | Keyboard and screen-reader review of core journeys | No keyboard trap; controls/status/errors are perceivable and operable | Must | Manual plus automation |
| E2E-01 | FR-CAT, FR-SEARCH, FR-COMP | Browse, filter, open details, compare two fixtures | Core discovery journey completes with correct API data | Must | Browser |
| E2E-02 | FR-REC-01..04 | Submit preferences and view results | Ranked explanations reflect response; empty result is recoverable | Must | Browser |
| E2E-03 | FR-AUTH, FR-FAV, FR-USER | Register/login, save preference/favorite, logout | User-specific state is isolated and session ends as documented | Must | Browser |
| E2E-04 | FR-ADMIN-01..03 | Admin creates/edits/publishes synthetic fixture | Admin flow works; visitor sees only published record | Must | Browser |

## 7. Non-functional and security checks

| Test ID | Related requirement | Method and acceptance evidence | Priority | Automation |
|---|---|---|---|---|
| NFR-01 | NFR-PERF-01 | Run against agreed isolated dataset; measure p95 list/detail and recommendation latency; compare with approved targets | Should | Repeatable performance run |
| NFR-02 | NFR-REL-01 | Stop Catalog/ML dependency in test; confirm timeouts and unaffected core endpoints | Must | Integration |
| NFR-03 | NFR-REL-02 | Force persistence failure during mutation; confirm no partial write | Must | Integration |
| SEC-01 | NFR-SEC-01 | Inspect stored user record and API serialization; verify only adaptive password hash persisted and no secret serialized | Must | Integration |
| SEC-02 | NFR-SEC-02 | Test invalid token signature/issuer/audience/expiry and lifecycle | Must | API integration |
| SEC-03 | NFR-SEC-03 | Submit operator-shaped input, malformed IDs, huge strings/arrays, invalid content types | Must | API integration |
| SEC-04 | NFR-SEC-04 | Cross-user profile/preferences/favorites/history ID substitution | Must | API integration |
| SEC-05 | NFR-SEC-05 | Anonymous/regular/admin role matrix against every admin route | Must | API integration |
| SEC-06 | NFR-SEC-06 | Inspect all error responses for stack traces, tokens, DB errors, service URLs | Must | API contract/security |
| SEC-07 | CORS/CSRF | Verify allowlisted origin behavior; if cookies selected, test CSRF protections and cookie flags | Must | Integration/manual |
| SEC-08 | NFR-SEC-06 | Verify rate limits for auth and expensive endpoints; capture `429` behavior | Should | API integration |
| SEC-09 | Service data isolation | With each service database credential, attempt access to other logical databases | Must | Environment/security check |
| SEC-10 | NFR-OBS-01 | Inspect test logs for token/password/secret leakage after representative failures | Must | Automated log scan/manual |
| SEC-11 | NFR-CONFIG-01 | Start service without required configuration; verify explicit startup failure and no insecure default | Must | Automated startup test |
| A11Y-01 | NFR-A11Y-01 | Automated accessibility scan plus manual keyboard review on core flows | Must | Automated and manual |

## 8. Contract and compatibility tests

- Validate each public endpoint request/response against
  `05_API_SPECIFICATION.md`.
- Validate Recommendation-to-Catalog and Recommendation-to-Identity
  internal contract versions, auth, pagination, and error behavior.
- Ensure rolling service updates remain compatible for the documented
  deployment window.
- Check unknown fields and error envelopes consistently across services.
- Test issuer/audience/public-key rotation behavior for all services
  once the authentication design is selected.
- Fail CI for unreviewed API-contract breaking changes or update the
  contract and affected tests together.

## 9. Proposed commands and evidence

Exact package scripts are established when service manifests are
created. Candidate commands:

```text
Frontend:          npm run lint && npm run test -- --run && npm run build
Identity service:  npm test
Catalog service:   npm test
Recommendation:    npm test
ML service:        pytest
Browser flows:     npx playwright test
```

The commands above are templates, not evidence that scripts currently
exist or have passed. The repository must document final commands per
service.

Before a feature is marked complete, record:

1. Requirement IDs implemented.
2. Test IDs added/updated and exact command executed.
3. Actual pass/fail counts and relevant failure details.
4. Test DB/environment isolation confirmation.
5. Browser or manual accessibility evidence where required.
6. Known limitations, skipped tests with reasons, and unresolved
   decisions.

Do not suppress failures, mark unrun tests as passed, or substitute
lint/build success for behavior tests.

## 10. Completion gates

- Every Must functional requirement has a passing test or explicitly
  documented, repeatable manual verification.
- Security tests for authentication, role enforcement, ownership,
  internal service access, and safe errors pass.
- Recommendation boundaries, deterministic ranking, missing data, and
  empty results are verified.
- Catalog/Recommendation service downtime behavior is verified.
- Frontend loading, empty, error, responsive, and keyboard-accessible
  states are verified.
- Build, lint, and relevant test commands pass for each changed service.
- Optional ML and recommendation history remain disabled unless their
  approval gates and tests are completed.

## 11. Decisions required before test implementation

1. Frameworks/package scripts and database test strategy.
2. Token expiry, refresh/revocation, CSRF, and public-key rotation test
   specifics (secure HttpOnly SameSite cookie transport is selected).
3. Final search pagination limits, comparison cap, rate limits, and
   latency targets.
4. Scoring weight, strict/soft filters, evidence threshold, and
   deterministic tie-break policy.
5. Whether account deletion, recommendation history, or audit log
   retention is in scope.
6. Browser test environment and supported target browsers.
7. Whether/when suitable longevity training and evaluation data becomes
   available; until then test only the disabled feature behavior.

## 12. Review gate

This strategy is a test plan and contains no claim that tests have been
run. Approve the test layers, targets, and isolation approach before
creating the implementation plan.
