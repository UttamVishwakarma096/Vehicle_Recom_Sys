# AI Coding-Agent Instructions

## Required reading

Before changing code, read:

- `docs/01_PRD.md`
- `docs/02_REQUIREMENTS.md`
- `docs/03_SYSTEM_ARCHITECTURE.md`
- `docs/04_DATABASE_DESIGN.md`
- `docs/05_API_SPECIFICATION.md`
- `docs/11_IMPLEMENTATION_PLAN.md`
- Other relevant design and security documents for the task

The architecture is a user-approved three-service design:

- Identity and User Service
- Vehicle Catalog Service
- Recommendation Service

Each service owns its database. Never access another service's
collections directly.

## Product and architecture rules

1. Work on one approved milestone at a time.
2. Follow the approved product requirements, architecture, database
   boundaries, and API contracts.
3. Do not add features or change agreed behavior without approval.
4. Keep services independently deployable; do not introduce another
   service, queue, cache, service mesh, or orchestration platform
   without documented justification and approval.
5. Keep database access inside the owning backend service. The browser
   must never receive database credentials, signing keys, or internal
   service credentials.
6. Validate all external inputs on the server and use allowlisted
   request fields and query construction.
7. Enforce authentication, role checks, and resource ownership on the
   server. Client-side checks are not security controls.
8. Never hardcode production vehicle data or present synthetic fixtures
   as verified information.
9. Preserve missing, unknown, unverified, and unavailable data states.
   Do not invent specifications, prices, reliability evidence, or
   training labels.
10. Recommendation scores are backend-calculated preference matches,
    not probabilities or guarantees. Do not duplicate authoritative
    scoring in React.
11. Keep longevity prediction disabled unless the approved evidence
    gates pass. Do not claim model performance without executed,
    reproducible evaluation. Any separately approved fallback must be
    explicitly non-predictive.
12. Use documented API contracts. Update API documents and tests with
    any approved contract change.
13. Follow existing project conventions and use focused, maintainable
    modules.
14. Do not introduce unnecessary dependencies or edit unrelated files.
15. If requirements conflict or a consequential choice is unresolved,
    stop and explain the conflict rather than silently choosing.

## Before changing code

1. Identify the active milestone in `docs/11_IMPLEMENTATION_PLAN.md`.
2. Read the relevant requirements, API, architecture, and security
   sections.
3. Inspect the current repository and working changes.
4. State the proposed scope, files, dependencies, risks, and affected
   tests.
5. Ask for approval when the change materially affects architecture,
   authentication, data ownership, API contracts, privacy, or prediction
   validity.

## After changing code

1. Summarize files changed and behavior implemented.
2. Add or update tests for behavior changes.
3. Run relevant lint, build, and test commands; report actual results.
4. Do not report unexecuted tests as passed or suppress a failing test
   to create a success result.
5. Report known limitations and remaining risks.
6. Update `docs/12_DEVELOPMENT_LOG.md` with completed work, decisions,
   actual validation results, and unresolved issues.
7. Do not begin the next milestone automatically.

## Test and data safety

- Use isolated synthetic test data and dedicated test databases.
- Never run destructive tests against production data.
- Do not include secrets in fixtures, logs, documentation, or source.
- Keep environment-specific values out of source control and frontend
  bundles.
- Confirm service database credentials cannot access another service's
  database.

## Completion report

For each milestone, report:

- Milestone and objective.
- Implemented behavior and files changed.
- API/schema changes.
- Tests and exact commands executed, with actual pass/fail results.
- Acceptance criteria satisfied or still unmet.
- Known issues, unapproved decisions, and recommended next milestone.
