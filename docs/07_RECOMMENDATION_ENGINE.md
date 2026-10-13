# Explainable Recommendation Engine

**Product:** Smart Vehicle Recommendation System  
**Status:** Draft for review  
**Owner:** Recommendation Service  
**Source documents:** `01_PRD.md` through `06_UI_UX_GUIDELINES.md`  
**Version:** 1.0

## 1. Goals and non-goals

The initial recommender is a deterministic, backend-owned rule-based
system that helps rank catalog vehicles against user-stated needs.
Identical preferences, scoring configuration, catalog snapshot, and
rule version must produce identical eligibility, scores, explanations,
and ordering.

The recommender does not:

- Predict satisfaction, reliability, safety, repair probability, or
  lifespan.
- Invent vehicle specifications, reliability statistics, or evidence.
- Treat a match score as a probability or proof that a vehicle is
  objectively best.
- Use a trained recommendation model without suitable data and a
  separately approved evaluation plan.

## 2. Inputs and normalized representation

The Recommendation Service accepts a validated request with:

- **Hard constraints:** Explicit requirements that exclude candidates
  when they fail or their required value is unknown.
- **Soft preferences:** Desired attributes that influence ranking but
  do not exclude a candidate solely for a mismatch.
- **Priority values:** User-stated importance for approved scoring
  dimensions.
- **Catalog snapshot:** Published catalog fields fetched through the
  Catalog Service API, including source/verification metadata and
  whether each value is known.

### Proposed conceptual request model

```json
{
  "constraints": {
    "budget": {
      "min": 500000,
      "max": 1000000,
      "currency": "INR",
      "priceType": "ex_showroom"
    },
    "vehicleTypes": ["body-type-enum"],
    "fuelTypes": [],
    "transmissions": [],
    "minimumSeats": 5
  },
  "preferences": {
    "vehicleTypes": [],
    "fuelTypes": ["fuel-type-enum"],
    "transmissions": [],
    "drivingEnvironment": "mixed",
    "annualDistanceKm": 12000,
    "priorities": {
      "reliability": 4,
      "maintenanceCost": 3,
      "fuelEfficiency": 5,
      "safety": 4,
      "performance": 2
    }
  }
}
```

This is a conceptual schema, not a claim that those enumerated values
or priority scales are already approved. The current API draft in
`05_API_SPECIFICATION.md` must be revised to represent hard constraints
separately from soft preferences before implementation.

### Validation

- Accept only allowlisted fields/enums and finite numeric values.
- Budget amounts use INR and a single specified price type for the
  request. Lower bound cannot exceed upper bound.
- Priority values must be within an approved bounded scale; never accept
  arbitrary client-supplied final weights or scores.
- Missing optional values remain absent, not defaulted to assumed user
  intent.
- Unsupported preference dimensions are rejected or explicitly ignored
  according to the published API contract; they are never silently
  scored.

## 3. Phase 1: eligibility filtering

Eligibility is applied before ranking. Each requested hard constraint
is evaluated against the matching catalog field:

1. **Budget:** When supplied as a hard constraint, compare the vehicle's
   selected price type and currency to the inclusive requested bounds.
   A vehicle without a compatible, known price is ineligible and its
   missing-price reason is reported.
2. **Vehicle type, fuel, transmission:** Exclude only when the user
   explicitly marks that value as required and the known catalog value
   fails the requirement. A missing required value is not a match.
3. **Seating capacity:** For a hard `minimumSeats`, exclude if known
   seating is below the minimum; unknown capacity cannot satisfy a hard
   minimum.
4. **Other fields:** Treat as hard filters only if explicitly named in
   the approved constraint schema. Do not infer strictness from a
   questionnaire answer.

### Handling edge cases

- **Optional preference missing:** Omit the factor; do not invent a
  preference.
- **Catalog value missing:** Do not award a positive match. Record the
  dimension as unavailable.
- **Invalid preference:** Return field-level validation errors; do not
  run a partial query with invalid values.
- **No eligible vehicles:** Return an empty result and identify which
  constraints most limited results where this can be derived safely.
  Never relax a hard constraint silently.
- **Incomplete catalog:** Preserve eligible results if their hard
  constraints can be verified; disclose missing scoring evidence and
  apply the aggregate-score policy below.
- **Catalog Service failure:** Return a clear downstream-unavailable
  error; do not score stale or fabricated candidates unless a separately
  approved, versioned data snapshot mechanism exists.

## 4. Phase 2: weighted ranking

### Scoring dimensions

Potential factors are scored only when the catalog contains approved
evidence and a documented transform:

| Dimension | Candidate evidence | Initial behavior |
|---|---|---|
| Budget fit | Compatible verified price and requested range | Score relative budget headroom using a documented configurable rule |
| Fuel efficiency | Explicitly identified claimed/observed value and unit | Score only comparable values; claimed and independently measured values remain distinguishable |
| Reliability evidence | Approved, traceable reliability evidence and method | Unavailable until an authorized, defensible source/scale is defined; do not invent a reliability score |
| Maintenance affordability | Supported maintenance-cost evidence with period/market context | Unavailable until a source, comparable units, and normalization rule are approved |
| Safety | Traceable rating/feature evidence with source, scheme, and model/variant context | Compare only compatible evidence; do not infer a rating from missing fields |
| Performance | Catalog values such as power only when verified and comparable | Score only if the user prioritizes performance and comparable data exists |
| Other approved preference | Explicitly supported catalog field | Add only through documented config and contract |

### Normalization

Each component score is normalized to `[0, 100]`. A component's
transformation must define:

- Source field and provenance requirements.
- Units and compatible comparisons.
- Expected bounds and outlier handling.
- Whether higher or lower values better match the preference.
- Treatment of unknown/unverified values.

The transform and bounds are versioned configuration. They are
hypotheses until supported by an approved validation process. Never
derive or display real-world reliability/safety/maintenance rankings
from unsupported assumptions.

### Initial budget-fit hypothesis

If a valid price is within the hard budget range:

- When `max > min`, a configurable example is
  `100 * (max - price) / (max - min)`, clamped to `[0, 100]`.
- When `max == min`, an exact price match scores `100`; a non-match is
  ineligible if the budget is hard.
- If only an upper limit is supported by the approved request schema,
  a separate transformation must be defined rather than reusing this
  formula.

This example favors lower-priced vehicles within the requested range;
it is a configurable product hypothesis, not a validated indicator of
value or affordability. The product owner must approve the desired
budget-fit meaning before enabling it.

### Weight validation and normalization

- Convert approved user priority inputs to non-negative server-side
  weights using a versioned mapping.
- The client cannot supply or override raw final weights.
- Reject non-finite, negative, unknown, or out-of-range priority values.
- Normalize mapped weights so their sum is `1` when at least one
  supported dimension is active.
- If all effective weights are zero or all corresponding evidence is
  missing, do not produce a misleading aggregate score.
- The default mapping and priority range require product approval and
  must be configurable without changing endpoint behavior silently.

### Missing evidence and aggregate score

For each candidate:

1. Score only dimensions with valid, comparable evidence.
2. Record an explicit unavailable reason for every unscored dimension.
3. Calculate weighted evidence coverage:
   `sum(weights of scored dimensions) / sum(all active weights)`.
4. Where an aggregate is permitted by the approved minimum coverage
   threshold, renormalize over scored weights only:
   `sum(componentScore * componentWeight) / sum(scored componentWeight)`.
5. Below the configured minimum coverage, return the candidate with
   component reasons as appropriate but mark the aggregate
   `insufficient_data` instead of displaying a numeric score.

The coverage threshold, whether low-coverage candidates remain in
ranked output, and how to sort them require approval. Missing data must
never receive a zero-as-failure or maximum-as-success score unless the
product explicitly approves and explains that policy.

### Output semantics

For each result return:

- Overall match score only where permitted by coverage policy.
- Evidence coverage and scoring-rule version.
- Component scores and which factors were unscored.
- Reasons linked to submitted preferences and catalog evidence.
- Trade-offs and constraints.
- Missing-data and provenance warnings.

A score is a preference match produced by these rules; it is not a
probability of satisfaction, reliability, safety, quality, or lifespan.

## 5. Phase 3: explanations

Explanations are generated from the same deterministic evaluation
records used for ranking, not from unrelated generated text.

### Explanation categories

- **Match reason:** A preference and verified catalog field aligned.
- **Trade-off:** A relevant preference was not met or another factor
  scored lower.
- **Constraint:** A hard constraint was met; hard failures should not
  appear in results.
- **Missing data:** A required/scoring field is unknown, unverified, or
  incomparable.
- **Data provenance:** Source/verification context affects how a result
  should be interpreted.

Each explanation should identify a human-readable label, safe value/unit
when available, and a stable machine-readable reason code for UI/tests.
Do not show internal scoring weights unless the product explicitly
approves exposing them.

### Example response fragment

```json
{
  "rank": 1,
  "matchScore": null,
  "scoreStatus": "insufficient_data",
  "evidenceCoverage": null,
  "componentScores": {
    "budgetFit": 80
  },
  "reasons": [
    {
      "code": "WITHIN_BUDGET",
      "label": "Fits the selected budget range"
    }
  ],
  "tradeoffs": [],
  "missingData": [
    {
      "dimension": "fuelEfficiency",
      "reason": "No comparable verified value is available."
    }
  ],
  "ruleVersion": "rules-v1"
}
```

All numbers above are illustrative placeholders, not vehicle
specifications, evaluated scores, or validated weights.

## 6. Ranking stability and tie-breaking

- Evaluate candidates against one Catalog Service response/snapshot per
  request; do not mix values fetched at different times.
- Sort by aggregate score descending when a score is available.
- The behavior for candidates below minimum evidence coverage must be
  approved; recommended default is to separate them into an
  “insufficient evidence” group after scored results, not interleave
  them by fabricated score.
- Break exact ties by a stable secondary key such as normalized make,
  model, model year, then opaque vehicle ID.
- Include the rule version in responses and logs.
- Any change in transformations, priority mapping, or tie-breaks
  increments the rule version and has regression tests.

## 7. Outliers, validation, and data quality

- Reject malformed values, impossible types, unsupported units, and
  invalid enum values at the service boundary.
- Do not silently clamp malformed catalog inputs into plausible values;
  flag them for catalog correction.
- Apply documented, versioned caps only to supported numeric inputs
  where an extreme but valid measurement would otherwise dominate.
- Treat claimed versus measured mileage distinctly and never compare
  incompatible units without an explicit conversion rule.
- Exclude unsupported/unverified evidence from a component score unless
  its use is explicitly approved and surfaced in explanations.
- Recommendation service consumes only published Catalog Service data.

## 8. Worked examples (hypothetical only)

The following examples illustrate behavior and are not real vehicles,
market data, verified specifications, or model outputs.

### Example A: mandatory constraint excludes

- User requires at least five seats.
- **Hypothetical Vehicle A** has a known capacity below five.
- **Result:** Ineligible before scoring. Explain that the selected
  seating constraint was not met.

### Example B: missing required information

- User requires a specific fuel type.
- **Hypothetical Vehicle B** has no known fuel-type value.
- **Result:** Ineligible because a required constraint cannot be
  verified. Report missing catalog data; do not infer the fuel type.

### Example C: incomplete soft-preference evidence

- User prefers a fuel-efficiency priority.
- **Hypothetical Vehicle C** satisfies hard constraints, but the
  catalog has no comparable efficiency evidence.
- **Result:** Keep it only if the approved policy permits candidates
  with unscored soft dimensions. Do not award an efficiency score; show
  the evidence gap and compute an aggregate only if the approved
  coverage threshold is met.

### Example D: equal score

- **Hypothetical Vehicle D** and **Hypothetical Vehicle E** have the
  same eligible component evidence and aggregate score.
- **Result:** Apply the documented stable tie-break key; repeat requests
  with identical catalog data produce the same order.

## 9. Performance and scaling

- Request only fields required for eligibility, scoring, and result
  display from the Catalog Service.
- Use bounded pagination or a private service search endpoint; do not
  retrieve an unbounded catalog into Recommendation Service memory.
- Set a timeout and maximum candidate count for cross-service calls;
  if a candidate cap could exclude otherwise eligible results, disclose
  and approve that behavior before implementation.
- Keep scoring computationally simple; target performance limits are
  specified in `02_REQUIREMENTS.md` and must be measured on an agreed
  dataset size.
- Do not introduce caches or asynchronous infrastructure without
  documenting consistency and operational requirements.

## 10. Required test scenarios

1. Inclusive budget minimum/maximum boundaries.
2. Price below/within/above range and mismatched price type/currency.
3. Strict preference match, strict mismatch, and missing required value.
4. Soft preference match, mismatch, and missing evidence.
5. All priorities absent, zero, invalid, or outside allowed bounds.
6. Invalid/non-finite catalog values and unsupported units.
7. Deterministic component scores, aggregate, explanations, and ranking
   for identical inputs and a fixed catalog response.
8. Equal scores and stable tie-break order.
9. Evidence coverage at, above, and below the approved threshold.
10. All scoring evidence missing; no misleading aggregate score.
11. Empty eligible set without silently relaxed constraints.
12. Catalog Service timeout, malformed response, and unavailable
    vehicle references.
13. Outlier behavior and claimed versus measured data.
14. Published-only candidate behavior.
15. Response disclaimers and reason codes correspond to actual evidence.
16. Regression tests when rule version or weight mapping changes.

## 11. Decisions requiring approval

1. Which fields are mandatory constraints versus soft preferences, and
   how that distinction appears in the user questionnaire/API.
2. Priority scale and mapping to weights, including default weights.
3. Whether the budget-fit hypothesis favors budget headroom and how to
   treat budget ranges.
4. Trusted data sources and scoring transforms for efficiency,
   reliability evidence, maintenance affordability, safety, and
   performance.
5. Evidence coverage threshold and handling/ranking of candidates below
   it.
6. Whether missing/unverified data excludes a vehicle from a soft-factor
   score, from all ranking, or only suppresses an aggregate score.
7. Tie-breaking order and candidate cap/pagination semantics.
8. Which catalog provenance fields and explanation details are shown
   to users.

## 12. Review gate

This is an algorithm design, not an implementation or validated
recommendation model. Approve the hard/soft preference contract,
initial weight policy, budget semantics, and missing-evidence policy
before implementing the Recommendation Service.
