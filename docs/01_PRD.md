# Product Requirements Document

**Product:** Smart Vehicle Recommendation System  
**Status:** Draft for review  
**Document version:** 1.0

## 1. Problem statement

Choosing a vehicle requires comparing many specifications, prices, and
ownership considerations across a fragmented set of sources. Buyers may
not know which specifications matter for their budget and usage, and
raw comparison tables do not explain why a vehicle may or may not suit
them.

The system will organize a vehicle catalog and help users discover,
compare, and shortlist vehicles using their stated needs. Catalog
coverage and accuracy depend on verified data being available; the
system must make missing or unverified information visible rather than
guessing.

## 2. Product vision

Provide a responsive web application that makes vehicle discovery more
structured and understandable. Recommendations will be explainable
matches to a user's stated preferences, not claims that one vehicle is
objectively best.

The product may later explore longevity estimation only if appropriate,
representative, labeled data can be obtained and evaluated. Until then,
it will provide, at most, a clearly labeled non-predictive ownership
suitability assessment based on documented rules and available evidence.

## 3. Target users and personas

### Primary users

- **First-time buyer:** Has a budget and practical needs, but wants help
  understanding vehicle trade-offs.
- **Family buyer:** Needs to compare seating, safety, body type, and
  running-cost considerations for regular use.
- **Research-oriented buyer:** Knows their preferred specifications and
  wants filters and side-by-side comparison.

### Supporting users

- **Catalog administrator:** Maintains vehicle entries and data
  provenance, and corrects or removes inaccurate catalog data.
- **Project evaluator:** Reviews whether recommendations are
  deterministic, explainable, testable, and responsibly presented.

These personas are representative product scenarios, not claims about
measured customer research.

## 4. User journeys

### Discover and compare

1. A visitor opens the vehicle discovery page.
2. They search and filter the available catalog by budget, brand, fuel,
   transmission, seating capacity, body type, or supported
   specifications.
3. They open a vehicle detail page and review available specifications,
   price type, source, and data freshness.
4. They select a small set of vehicles for side-by-side comparison.
5. They can register or log in to save vehicles and preferences.

### Get recommendations

1. A user enters a budget range and applicable vehicle preferences.
2. The system validates the inputs and identifies eligible catalog
   entries.
3. The system ranks eligible vehicles using documented, deterministic
   rules and configured preference weights.
4. The results show match scores, reasons, trade-offs, constraints, and
   missing-data warnings.
5. If preferences are incomplete or no vehicles qualify, the system
   explains the issue and allows the user to revise inputs.

### Maintain catalog data

1. An authorized administrator signs in.
2. They create or update a vehicle record with supported values and
   provenance.
3. The system validates the record and prevents unauthorized changes to
   protected fields.
4. The updated vehicle becomes available in discovery and recommendations
   according to its publication status.

## 5. Product scope

### Essential MVP

1. Responsive vehicle discovery and catalog listing.
2. Vehicle detail pages with clear distinction between unknown,
   unavailable, and verified specifications.
3. Search, filtering, sorting, and pagination over available catalog
   data.
4. A preference questionnaire for recommendation inputs supported by
   the catalog.
5. Deterministic, rule-based, explainable recommendation ranking.
6. Side-by-side comparison of a bounded set of vehicles.
7. User registration and login.
8. Saved vehicles and user preference management.
9. Role-protected administrator access and basic vehicle create, read,
   update, and delete operations.
10. Clear validation, empty, loading, and error states.
11. An honest longevity/suitability experience: no lifespan prediction
    is shown unless suitable labeled data and an evaluated model are
    approved. Without that evidence, any ownership suitability score
    must be explicitly heuristic and non-predictive.

### Optional enhancements / later versions

- Recommendation history, if users demonstrate a need and retention
  rules are defined.
- A validated experimental longevity model, contingent on suitable data,
  target definition, bias review, and an evaluation plan.
- Additional comparison metrics, data-provider integrations, and
  regional catalog coverage after their data quality and licensing are
  established.
- More advanced analytics or administrative audit reporting, if justified
  by operational needs.

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The system shall display published vehicle entries from the catalog. | Must |
| FR-02 | Users shall be able to search and filter by supported catalog fields, including budget, brand, fuel, transmission, seating capacity, and body type. | Must |
| FR-03 | Users shall be able to view vehicle details and distinguish verified, unverified, and missing values. | Must |
| FR-04 | The system shall accept recommendation preferences including budget, vehicle type, fuel, transmission, seating, driving environment, annual distance, and stated ownership priorities, where supported. | Must |
| FR-05 | The recommendation engine shall apply eligibility rules before ranking, return deterministic ranked matches, and explain scores, trade-offs, constraints, and missing data. | Must |
| FR-06 | Users shall be able to compare a bounded number of vehicles using consistent fields and explicit missing-value indicators. | Must |
| FR-07 | Users shall be able to register, log in, and log out securely. | Must |
| FR-08 | Authenticated users shall be able to save and remove vehicles and manage their own preferences. | Must |
| FR-09 | Administrators shall be able to manage vehicle records; all administrative operations shall be authorized by the server. | Must |
| FR-10 | The system shall handle invalid inputs, unavailable records, empty results, and service failures with clear, non-sensitive messages. | Must |
| FR-11 | The system may preserve recommendation history if the requirements, privacy expectations, and retention behavior justify it. | Could |
| FR-12 | The system may provide an experimental longevity estimate only after the target, data quality, evaluation, uncertainty, and limitations have been approved. Otherwise it shall not present an ML prediction. | Could |

## 7. Non-functional requirements

- **Security:** Hash passwords; enforce authentication, authorization,
  input validation, and ownership checks on the server. Never expose
  database credentials, signing secrets, or internal service credentials
  to the browser.
- **Privacy:** Collect only data needed for the features. Explain what
  user data is stored and provide an account-data deletion policy before
  production use.
- **Data integrity:** Validate catalog records and retain provenance,
  verification timestamps, and price type where available. Do not
  silently substitute invented specifications.
- **Explainability:** Recommendation outputs must be reproducible from
  the same inputs, weights, and catalog snapshot. A match score is not a
  probability of satisfaction, reliability, safety, or lifespan.
- **Accessibility:** Target WCAG 2.1 AA practices, including keyboard
  operation, meaningful labels, visible focus, and adequate contrast.
- **Responsiveness:** Support small mobile, tablet, and desktop
  viewports without losing core discovery or comparison functionality.
- **Performance:** Paginate catalog results and avoid loading the full
  catalog into the browser. Agree measurable latency targets in the
  requirements phase, based on the expected deployment and data volume.
- **Reliability:** Degrade gracefully when optional ML functionality is
  unavailable; core catalog and rule-based recommendation behavior must
  not depend on ML availability.
- **Maintainability and testability:** Keep frontend, backend modules,
  data access, and any optional ML service separated by documented
  interfaces. Test validation, permissions, ranking, and failure paths.
- **Observability:** Record operational errors without logging
  credentials, passwords, tokens, or unnecessary personal data.
- **Configuration:** Keep secrets and environment-specific settings out
  of source control and browser bundles.

## 8. User stories and acceptance criteria

### US-01: Find vehicles that fit a budget

As a buyer, I want to filter vehicles by budget and preferences so I can
focus on relevant catalog entries.

**Acceptance criteria**

- Valid filters can be combined and applied to published catalog
  entries.
- Invalid ranges are rejected with field-specific feedback.
- An empty result set is clearly reported and can be revised.
- The system does not treat a missing price as within budget.

### US-02: Understand a vehicle listing

As a buyer, I want to inspect a vehicle's specifications and their data
quality so I can judge what is known.

**Acceptance criteria**

- The detail view displays available supported specifications.
- Unknown or unavailable values are identified instead of invented.
- Price type and provenance are shown when those values exist.

### US-03: Receive explainable recommendations

As a buyer, I want ranked matches and explanations so I can understand
how my stated priorities affected the result.

**Acceptance criteria**

- Mandatory eligibility preferences are applied before ranking.
- Identical preferences, weights, and catalog data produce the same
  ordered results and scores.
- Each result includes its match score and understandable match reasons
  or trade-offs.
- Missing data is surfaced and does not become fabricated positive
  evidence.
- The interface does not describe the match score as a guarantee or
  probability.

### US-04: Compare options

As a buyer, I want to compare a limited set of vehicles side by side so
I can review differences efficiently.

**Acceptance criteria**

- The comparison view uses the same specification rows for every
  selected vehicle.
- Missing specifications are marked consistently.
- The user is told when the comparison limit is reached.

### US-05: Save vehicles

As a registered user, I want to save and remove vehicles so I can return
to them later.

**Acceptance criteria**

- Only authenticated users can access their saved list.
- A user cannot view or modify another user's saved list.
- Saving the same vehicle twice has a documented, non-duplicating
  outcome.
- A vehicle that no longer exists is handled without exposing internal
  errors.

### US-06: Manage catalog entries

As an administrator, I want to maintain vehicle records so users see
usable catalog information.

**Acceptance criteria**

- Non-admin users cannot create, change, or delete catalog records.
- Invalid fields are rejected with actionable feedback.
- Updates preserve permitted provenance and verification information.
- Client-supplied role or protected fields cannot grant administrative
  access or overwrite protected values.

### US-07: Understand longevity information

As a buyer, I want any longevity-related result to be presented honestly
so I do not mistake a heuristic or experimental output for a guarantee.

**Acceptance criteria**

- No ML lifespan estimate is presented without an approved target,
  suitable labeled data, and documented evaluation.
- Any fallback is labeled as a non-predictive suitability assessment and
  explains its inputs and limitations.
- Model downtime does not prevent catalog discovery or rule-based
  recommendations.

## 9. Business rules

1. Only published catalog records appear in public discovery or
   recommendation results.
2. A missing or unknown specification is not equivalent to a favorable
   value.
3. Price comparisons must use compatible price types and currency;
   catalog design targets INR, and ex-showroom, on-road, and used-vehicle
   prices must not be conflated.
4. Mandatory preferences determine eligibility; optional preferences
   influence ranking only when supported by data.
5. Scores and weights are configurable hypotheses until validated; they
   must not be represented as objective market or reliability facts.
6. A deterministic tie-breaking rule must be defined in the
   requirements/design phase.
7. Users may manage only their own profile, preferences, and favorites.
8. Administrative privileges are granted and enforced by the backend,
   never accepted from client-submitted data.
9. Longevity model outputs, if ever enabled, must state the target,
   limitations, and uncertainty appropriate to the evaluated model.
10. No real vehicle specification, reliability statistic, or training
    outcome may be fabricated or represented as verified.

## 10. Assumptions and constraints

- Initial product is a portfolio/college-project web application, not a
  safety-critical or financial decision system.
- The design follows the prompt pack's proposed stack: React, Tailwind
  CSS, Node.js/Express, MongoDB/Mongoose, JWT, and an optional
  Python/Flask/scikit-learn service.
- The product targets INR-denominated catalog prices, as required by
  the database design prompt. Geographic coverage and price update
  cadence still require approval.
- A usable catalog data source, licensing terms, verification process,
  and administrator workflow are not supplied by the prompt pack.
- Suitable, representative labeled longevity data is not supplied.
- Recommendation priorities and initial scoring weights require
  documented product decisions and must not be described as empirically
  validated without evidence.
- Deployment provider, production scale, retention periods, and legal
  jurisdiction have not been specified.

## 11. Success metrics

Metrics will be instrumented only after privacy and consent requirements
are defined. Initial project success can be assessed through:

- All Must-priority acceptance criteria have corresponding automated or
  documented tests.
- Search and filter operations return correct results for supported
  fields and boundaries.
- Recommendation results are deterministic and include explanations
  and missing-data warnings.
- Core user journeys work on mobile and desktop, including keyboard
  navigation.
- Unauthorized administrative and cross-user data operations are
  rejected in tests.
- Catalog entries used in a demonstration have traceable provenance;
  no sample fixture is presented as verified production data.
- The application does not claim validated longevity prediction unless
  an approved evaluation demonstrates it.

Numeric targets for latency, adoption, recommendation usefulness, and
catalog coverage must be agreed before production measurement; the
prompt pack provides no baseline data from which to set them.

## 12. Out of scope

- Guaranteeing vehicle reliability, resale value, safety, or lifespan.
- Replacing professional inspection, manufacturer information, or
  financial advice.
- Scraping or redistributing third-party data without authorization.
- Claiming a real-world ML prediction without appropriate outcome labels
  and evaluation evidence.
- Native mobile applications, payments, dealer transactions, and
  financing workflows.
- Microservices, message queues, caching platforms, and orchestration
  infrastructure without a justified requirement.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Incomplete, stale, or improperly licensed catalog data | Track provenance and verification dates; disclose gaps; approve data sources and licensing before production use. |
| Recommendation scores appear authoritative | Explain score meaning and inputs; show trade-offs and missing data; avoid probability or guarantee language. |
| Longevity model is trained on insufficient or biased data | Keep ML optional; require a defined target, representative labels, leakage checks, subgroup evaluation, and documented approval; use no prediction if evidence is inadequate. |
| Users submit malformed or extreme preferences | Validate inputs on the backend; define boundaries and clear error responses. |
| Personal data or administrator functions are exposed | Enforce server-side authorization and ownership; protect secrets; test unauthorized and cross-user access. |
| Price types or units are compared incorrectly | Store currency, price type, and relevant provenance; compare only compatible values. |
| Project scope exceeds portfolio-project capacity | Deliver Must-priority catalog, rules-based recommendations, comparison, identity, favorites, and admin functions first; defer optional ML and history. |

## 14. Decisions and unresolved questions for approval

The following decisions are intentionally not asserted as settled:

1. **Initial catalog market and coverage:** INR is the target currency
   per the database-design prompt, but the geographic scope, vehicle
   categories, and catalog source remain unspecified.
2. **Catalog data rights and verification:** Identify an authorized data
   source and who is responsible for updates before production data is
   loaded.
3. **Recommendation policy:** Approve which questionnaire preferences
   are mandatory versus optional, and approve initial configurable
   weights before treating them as product behavior.
4. **Comparison cap:** Set the maximum number of vehicles in one
   comparison in the API/UI design.
5. **Account and privacy policy:** Confirm whether account deletion,
   recommendation history, and retention are required for the MVP.
6. **Longevity feature:** MVP longevity functionality is omitted until
   adequate labeled data and evaluation evidence are approved. Any
   future non-predictive heuristic requires separate approval. No model
   prediction is assumed.
7. **Production targets:** Set measurable latency, availability, and
   catalog freshness targets when the deployment environment and data
   scale are known.

## 15. Approval gate

This draft is the first artifact in the prompt pack's staged workflow.
Review and approve its scope and unresolved decisions before creating
`02_REQUIREMENTS.md`. No application code or additional design
documents are included in this milestone.
