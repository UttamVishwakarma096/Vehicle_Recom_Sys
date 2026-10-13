# Security Guidelines

**Product:** Smart Vehicle Recommendation System  
**Status:** Security baseline with approved authentication policy  
**Scope:** React client, ingress/router, three Node.js services, MongoDB,
optional disabled-by-default Flask service  
**Source documents:** `01_PRD.md` through `08_AI_ML_DESIGN.md`  
**Version:** 1.0

## 1. Security objectives

- Keep user, administrator, catalog, and optional model operations
  isolated behind server-side authorization.
- Do not expose secrets or database connectivity to the browser.
- Preserve per-service data ownership and least privilege.
- Fail safely when tokens or downstream services are invalid or
  unavailable.
- Minimize personal data and sensitive information in logs.
- Do not claim controls are implemented until code and tests demonstrate
  them.

## 2. Password hashing and account security

- Store only adaptive, salted one-way password hashes; never plaintext
  passwords, reversible encryption, or passwords in logs.
- Use a maintained password-hashing implementation and document its
  cost parameters; tune those parameters for the deployment environment.
- Compare credentials using the library's verification function.
- Use generic login failures for unknown account and wrong password.
- Apply rate limits and abuse monitoring to registration and login.
- Define password length/quality policy and recovery/verification flows
  before production deployment.
- Password reset tokens, if added, must be short-lived, single-use,
  stored safely, and excluded from logs.

## 3. Authentication and token/session management

- The Identity and User Service owns account authentication and token
  issuance.
- Use signed JWTs only with explicit algorithm allowlisting, issuer,
  audience, expiry, and subject validation.
- Prefer asymmetric signing so other services receive only the public
  verification key and cannot mint credentials. Do not distribute the
  signing private key or a shared signing secret to Catalog or
  Recommendation services.
- Publish or distribute verification keys through a controlled
  JWKS/public-key mechanism with rotation and a bounded cache lifetime.
- Tokens contain only minimum claims needed by domain services (for
  example subject, role, issuer, audience, expiry, token ID); do not
  place preferences or unnecessary personal data in claims.
- Each service verifies the token and enforces authorization locally;
  ingress routing is not an authorization control.
- Define expiration, refresh, logout, revocation, key rotation, and
  account-disable behavior before implementation.

### Selected credential transport

Use a short-lived JWT in a `Secure`, `HttpOnly`, `SameSite=Lax`,
`Path=/` cookie. In production, use a `__Host-` cookie name and omit the
`Domain` attribute. Cookie-authenticated state-changing requests require
a synchronizer CSRF token and Origin validation. Production requires
HTTPS; any local-development exception must be environment-gated and
must never be used in production. Do not expose cookie values to
frontend JavaScript.

**Approved Identity Service policy:** sign access JWTs with RS256 and
publish public keys through JWKS; use a 15-minute access-token lifetime;
rotate 7-day refresh sessions on use and revoke the session on logout.
Hash passwords with Argon2id, accepting 12–128 characters. Email
verification and password recovery are deferred until an email provider
is selected. The implementation must still define key rotation/cache
details and safe refresh-token storage, then test the full lifecycle.

## 4. Role-based access and service authorization

- Roles are assigned and changed only through trusted administrator
  operations in the Identity Service.
- A client-supplied role or user ID never grants privileges.
- The Catalog Service enforces administrator authorization on every
  vehicle create/update/publish/unpublish/delete operation.
- The Identity Service restricts profile/preferences operations to the
  authenticated owner, except separately approved administrative
  functions.
- The Recommendation Service derives favorite/history ownership from
  the verified subject and rejects cross-user access.
- All services check token issuer, audience, signature, expiry, and
  permitted scopes/roles.
- Internal service callers use their own service identity and least
  privilege; user identity delegation must be explicit and validated.
- Tests must cover anonymous access, regular-user access, administrator
  access, revoked/expired identities, and cross-user resource access.

## 5. Input validation and database query safety

- Validate path IDs, query parameters, request bodies, content type, and
  size at every service boundary.
- Use schema validation and allowlisted fields/enums; reject unknown or
  protected fields.
- Do not pass raw client objects or MongoDB operators (`$where`,
  `$gt`, `$regex`, etc.) into Mongoose queries.
- Construct database filters from validated primitive values.
- Bound pagination, arrays, strings, numeric ranges, and batch ID lists.
- Avoid unsafe regular expressions and unbounded text-search requests.
- Normalize email before uniqueness checks.
- Validate service-to-service request payloads just like public
  requests.
- Catalog publication checks must validate provenance and fields
  without replacing missing values with guessed values.

## 6. Mass-assignment and object-level authorization

- Map request bodies to explicit DTOs/allowlists instead of persisting
  arbitrary objects.
- Never permit public profile/catalog inputs to modify `_id`, role,
  owner IDs, timestamps, password hashes, publication actor IDs, score
  results, model labels, or service metadata.
- For every resource operation, verify the target belongs to the
  authenticated user or the caller has an explicit administrator
  permission.
- Use opaque service-owned IDs; validate external user/vehicle identity
  through trusted claims or service APIs where current status matters.
- Attempt ID substitution and cross-tenant access in tests for each
  ownership-controlled route.

## 7. CORS, CSRF, and browser security

- Configure explicit allowed origins; never use wildcard origins with
  credentials.
- Allow only required methods and headers. Do not reflect arbitrary
  request origins.
- CORS is not an authorization mechanism; all service APIs validate
  credentials and permissions.
- If credentials use cookies, implement CSRF protection for
  state-changing routes according to the selected same-site and
  cross-origin deployment design.
- Set secure browser security headers at the frontend host/ingress,
  including an appropriate Content Security Policy, frame restrictions,
  MIME sniffing protection, and referrer policy.
- Render user-provided text as text; do not use unsafe HTML insertion.
- Validate and sanitize any rich text feature if one is approved later.
- Use HTTPS for all public and deployed internal communication.

## 8. Rate limiting and resource protection

Apply bounded request sizes, concurrency, and rate limits at ingress
and/or the owning service for:

- Registration and login.
- Catalog search and expensive filter combinations.
- Recommendation computation.
- Favorite mutation and batch comparison requests.
- Optional longevity estimates if they are ever enabled.
- Internal service APIs to constrain compromised callers.

Limit values must be chosen for expected users/hosting and documented.
Return `429` with safe retry guidance where appropriate. Add timeouts to
all network and database operations. Avoid uncontrolled retries and
unbounded fan-out between services.

## 9. Secrets and environment configuration

- Keep MongoDB URIs, JWT signing keys, service credentials, and ML
  credentials in a managed secret store or protected deployment
  configuration.
- Never place secrets in source control, frontend variables, build
  artifacts, logs, screenshots, or error messages.
- Provide only non-secret variable names and descriptions in
  `.env.example`.
- Use separate credentials per service/environment. Rotate secrets and
  remove unused credentials.
- Fail startup clearly when required configuration is absent or
  malformed; do not fall back to hard-coded development secrets in
  production.
- Restrict access to deployment settings and secret stores.

## 10. Database permissions and service isolation

- Use one least-privilege MongoDB database identity per domain service.
- Identity credentials access only `vehicle_identity`; Catalog access
  only `vehicle_catalog`; Recommendation access only
  `vehicle_recommendations`.
- Do not grant a service write/read access to another service's
  collections.
- Restrict network access to database endpoints to application service
  networks/hosts.
- Enable encryption in transit and at rest according to provider
  capabilities and deployment policy.
- Use unique indexes to enforce account and favorite uniqueness.
- Backups, restore testing, retention, and production access must follow
  the approved operational policy.
- Integration tests use a separate test database; destructive tests
  must never target production.

## 11. Ingress and inter-service security

- Route public traffic only to intended public endpoints. Private
  internal routes must not be exposed through public ingress.
- Protect internal calls with TLS and service identities; rotate
  credentials and validate the caller at the receiving service.
- Do not rely only on private networking; authenticate and authorize
  service requests as well.
- Validate audience, allowed service identity, request size, and
  payload schema on internal endpoints.
- Pass correlation IDs but do not trust them as identity.
- Use allowlisted response fields and versioned contracts.
- Apply timeouts and bounded retry rules; do not retry non-idempotent
  mutations without an idempotency mechanism.

## 12. Optional ML service security

- Flask remains disabled until the longevity evidence gates are
  approved.
- If enabled, keep it on a private network with no browser/public route.
- Allow only the Recommendation Service to call it using a dedicated
  identity/credential and TLS.
- Validate every feature, unit, enum, range, schema version, and request
  size in Flask as well as Node.
- Load only approved, immutable model artifacts; do not accept arbitrary
  file paths or model names from users.
- Limit inference duration and concurrency; enforce a Node-side timeout.
- Return safe errors; never expose model paths, stack traces, training
  data, or environment variables.
- Do not use user requests for silent training or label collection.
- Model output must be schema-validated before it reaches the user.

## 13. Error handling and security logging

- Return stable, safe error codes and appropriate HTTP statuses.
- Do not reveal whether an account exists during login.
- Never return stack traces, database driver errors, internal IPs,
  secrets, tokens, passwords, or service credentials.
- Log authentication failures, authorization denials, admin mutations,
  validation abuse, and downstream failures with bounded context.
- Exclude passwords, cookies, bearer tokens, secret values, and
  unnecessary personal data from logs.
- Restrict log access and apply retention policy.
- Include a request correlation ID; treat it as diagnostic metadata, not
  authentication.

## 14. Dependency and operational security

- Keep package and Python dependency lockfiles current.
- Review and remediate known vulnerabilities before deployment.
- Avoid unneeded dependencies and pin/upgrade through reviewed change
  processes.
- Use separate development, test, and production configuration and
  identities.
- Establish patching, backup/restore, incident response, and access
  review procedures for production.
- Do not claim a security control is present until code, configuration,
  and tests verify it.

## 15. Required security tests

1. Registration stores no plaintext password; responses omit hashes.
2. Duplicate normalized email is rejected without account disclosure.
3. Login rejects invalid, expired, wrong-issuer, wrong-audience, and
   invalid-signature tokens appropriately.
4. Logout/revocation follows the selected lifecycle and rejects the
   invalidated credential.
5. Anonymous user cannot access profile, preferences, favorites, or
   admin routes.
6. Regular user cannot access admin vehicle operations.
7. User A cannot read/update User B's profile, preferences, favorites,
   or optional history by substituting IDs.
8. Client-supplied `role`, `ownerId`, score, protected timestamps, or
   model fields cannot be mass-assigned.
9. Malicious MongoDB operator-shaped strings do not alter query
   behavior.
10. Invalid path IDs and oversized bodies return safe validation
    errors, not stack traces.
11. CORS allows only configured origins; credentialed wildcard behavior
    is rejected.
12. Cookie deployments test CSRF controls, cookie flags, and session
    behavior; bearer deployments test token storage/expiry policy.
13. Internal routes reject browser-only/anonymous callers and
    unauthorized service identities.
14. Recommendation-to-Catalog and Recommendation-to-ML calls enforce
    timeouts, schema validation, and safe downstream errors.
15. Rate limits return `429` and do not leak sensitive values.
16. Service database credentials cannot access another service's
    database/collections.
17. Logs/errors contain no secrets, password material, or token values.

## 16. Decisions requiring approval

1. JWT lifecycle: expiry, refresh/revocation, logout, CSRF mechanism,
   and public-key rotation (cookie transport is selected).
2. Hosting ingress, CORS origins, and internal-network/service identity
   setup.
3. Rate-limit thresholds and request/body size ceilings.
4. Account verification/recovery and account deletion policy.
5. Database cluster layout, encryption, backup, and retention settings.
6. Production jurisdiction and privacy/legal requirements.
7. Enablement and operational ownership of the optional ML service.

## 17. Review gate

These guidelines define requirements, not implemented controls.
Confirm the remaining token lifecycle, ingress policy, and deployment
security decisions before coding authentication or exposing the services.
