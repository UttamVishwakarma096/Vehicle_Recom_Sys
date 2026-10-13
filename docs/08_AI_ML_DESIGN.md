# AI/ML Longevity Design

**Product:** Smart Vehicle Recommendation System  
**Status:** Design proposal; predictive feature disabled  
**Owner:** Optional private Python/Flask service  
**Source documents:** `01_PRD.md` through `07_RECOMMENDATION_ENGINE.md`  
**Version:** 1.0

## 1. Current decision and evidence status

No suitable labeled dataset, outcome definition, representative sample,
model evaluation, or performance result is supplied. Therefore:

- No trained longevity model is specified as ready for use.
- No lifespan or repair probability may be returned to users.
- The ML service remains disabled until the gates in this document are
  satisfied and approved.
- Any initial longevity-related MVP feature must either be omitted or
  be a separately approved, explicitly non-predictive ownership
  suitability heuristic.
- Synthetic fixture values must never be represented as training data
  or evidence of real-world model performance.

## 2. Define the prediction target first

Candidate targets are distinct and require different labels, censoring
rules, and evaluation.

| Candidate target | Possible formal definition | Required labels / concerns |
|---|---|---|
| Operational at a fixed horizon | Whether a vehicle is operational at a defined future time from a documented index date | Longitudinal follow-up and consistent definition of operational status; vehicles with incomplete follow-up cannot be naively labeled as failures/non-failures |
| Remaining service life | Time from index date to a precisely defined retirement/failure event | Event time, censoring, and reason for retirement; survival-analysis methods may be more appropriate than ordinary regression |
| Major repair within a horizon | Whether a defined major repair occurs within a specified period after the index date | Standardized repair taxonomy, time horizon, service records, exposure, and consistent event capture |

These targets are not interchangeable. A target must specify the vehicle
population, index date, prediction horizon, event definition, intended
user decision, and handling of censoring before data collection or
training begins.

**No target is selected in this draft.** Do not train or deploy a model
until one target is approved and labels can represent it faithfully.

## 3. Data requirements

### Candidate input features

Use only features that have a verified definition, availability at
prediction time, permission for use, and adequate data quality:

- Vehicle age/model year at a defined index date.
- Odometer mileage and measurement date.
- Powertrain/engine category and relevant configuration.
- Fuel type and transmission where they are justified for the target.
- Maintenance/repair history with standardized dates and categories.
- Usage patterns and driving environment only if collected consistently
  and permitted.
- Region, climate, or operating context only with a documented need and
  bias/privacy review.

Catalog specifications alone are not outcome labels. Maintenance data,
mileage observations, and actual outcomes must be modeled as separate
data concepts and carry source, timestamp, and quality metadata.

### Outcome labels and data sources

Before modeling, document:

- Authorized source/provider and license/consent basis.
- Population, geography, makes/models/years, and how records are
  selected.
- Label definition, event date, observation window, censoring, and
  missing outcomes.
- Linkage between vehicle identity, longitudinal observations, and
  event labels without unjustified identity inference.
- Coverage and known selection, survivorship, reporting, and
  manufacturer/service-network biases.
- Data retention, access, deletion, and audit policy.

The application team must not fabricate or scrape data without
permission. If no appropriate source exists, the predictive feature is
not available.

### Sample size and quality

Sample adequacy depends on target prevalence/event rates, model
complexity, number of independent vehicle groups, missingness, and
subgroup evaluation needs. A fixed record count cannot be set without
the target and data distribution. A modeling proposal must justify
sample size using the effective independent units and event counts, not
only the number of rows.

Quality checks must cover:

- Duplicate vehicle/observation records.
- Invalid dates, impossible values, and unit inconsistencies.
- Missingness patterns by provider, region, vehicle group, and outcome.
- Label consistency and inter-source disagreements.
- Data leakage from post-index-date information, outcome-derived fields,
  or repeated observations split across training and evaluation.
- Selection and survivorship bias, including vehicles observed only
  because a repair or sale was reported.
- Feature drift and source changes over time.

## 4. Training and evaluation plan

### Baseline and candidate models

After target approval:

1. Establish a simple, documented baseline appropriate to the target.
2. Compare candidate models only when the training data supports them.
3. Prefer interpretable, calibrated approaches where performance is
   comparable and users need explanation.
4. For censored time-to-event targets, evaluate survival-analysis
   approaches rather than treating censoring as an ordinary regression
   target. Select a compatible library and its maintenance/security
   policy before adding dependencies.
5. Do not select a model based solely on one aggregate metric or
   training score.

No specific algorithm, fitted parameters, or model artifact is selected
in this draft.

### Data split and leakage control

- Split by vehicle identity or another justified grouping key so related
  records do not cross train/test partitions.
- Consider temporal holdout to measure performance on later data.
- Keep the final test set isolated from feature/model selection.
- Fit preprocessing only on the training partition and version it with
  the model.
- For repeated observations, use a split strategy consistent with the
  deployment prediction point and target horizon.
- Document censoring treatment where the target has incomplete
  follow-up.

### Metrics by target

Select metrics only after the target is fixed:

- **Binary fixed-horizon outcome:** discrimination plus calibration,
  class-imbalance-aware measures, and decision thresholds justified by
  the user context.
- **Time-to-event:** metrics suitable for censored survival outcomes,
  such as concordance and time-dependent calibration/error measures,
  with methodological review.
- **Remaining service life:** error/calibration measures compatible with
  censoring and deployment range; ordinary MAE/RMSE alone may be
  misleading if censoring is present.
- **Major-repair event:** discrimination, calibration, class balance,
  and evaluation under a clearly defined time horizon.

Report confidence/uncertainty methods and subgroup results where
supported by the data. Do not publish a metric unless its dataset split,
target, sample, evaluation code, and limitations are reproducible.

### Bias and model review

Review performance and data coverage across supported makes/model
groups, model years, fuel/powertrain groups, regions, and other relevant
subgroups, subject to privacy and sample-size constraints. Record
groups for which evidence is insufficient. Do not use a model for
unsupported populations or imply equivalent performance where it has
not been evaluated.

## 5. Model development and operations

### Training pipeline

1. Validate source authorization and schema.
2. Create a versioned, immutable dataset snapshot with provenance.
3. Run quality and leakage checks.
4. Split data according to the approved validation design.
5. Fit preprocessing and baseline/candidate models on training data.
6. Evaluate on validation and held-out data; run bias/calibration
   review.
7. Store model, preprocessing, target definition, dataset version,
   code/dependency versions, metrics, and approval metadata.
8. Promote an artifact only after documented review; allow rollback.

Training must be separate from request handling. The service must never
silently retrain from user requests or production traffic.

### Reproducibility and versioning

For each promoted artifact, record:

- Model and preprocessing version.
- Target definition and horizon.
- Dataset snapshot identifier and provenance.
- Training code commit/version and dependency lock.
- Random seeds where applicable.
- Validation design, metrics, subgroup results, and known limits.
- Approval and deployment date.

Inference responses must identify the model/target version. Requests
must be traceable by correlation ID without persisting unnecessary
personal data.

## 6. Flask service design

The service is private and optional. Node's Recommendation Service is
the only caller; the browser never calls Flask directly.

### Health endpoint

- **Method/path:** `GET /health`
- **Access:** Private network; no model or environment secrets exposed.
- **Response:** `200` with minimal readiness status when the process is
  ready; `503` if a required approved model cannot be loaded and the
  endpoint is configured as model-required.
- The health response must not reveal artifact paths, credentials, or
  training data.

### Estimate endpoint (disabled until approval)

- **Method/path:** `POST /v1/estimate`
- **Authentication:** Service-to-service authentication and TLS in
  deployed environments.
- **Request:** Versioned, validated features supported by the approved
  target; includes no client-provided target label, score, or model
  version override.
- **Response when enabled:**

```json
{
  "target": {
    "name": "approved-target-id",
    "horizon": "approved-horizon"
  },
  "estimate": {
    "value": 0.0,
    "unit": "approved-unit"
  },
  "uncertainty": {
    "method": "approved-method",
    "summary": "Evaluation-supported uncertainty statement"
  },
  "modelVersion": "approved-model-version",
  "limitations": [
    "Applicable data and population limitations"
  ]
}
```

The numbers and text above are schema placeholders only. They are not
predictions, model results, accuracy claims, or approved target
definitions.

- **Timeout:** Node enforces a configured bounded timeout; proposed
  starting value is 2 seconds for a synchronous request, subject to
  measurement and approval.
- **Errors:** `400` invalid input, `401` missing/invalid service
  identity, `403` disallowed caller, `503` model unavailable/not
  enabled, `504` timeout, `500` safe internal error.
- **Response validation:** Node validates schema, target/model version,
  numeric bounds, and required limitations before returning a result.
- **Model loading:** Load the approved immutable artifact at process
  startup or through a controlled versioned reload. Fail readiness if
  the configured required artifact is invalid; do not substitute an
  unreviewed fallback model.

### Node-to-Flask controls

- Private service network; no public ingress for Flask.
- Dedicated service identity or deployment-supported workload
  identity; rotate credentials; do not share JWT signing keys.
- TLS for network calls where available.
- Request/response schema versioning, maximum body size, input bounds,
  timeouts, correlation IDs, and safe error mapping.
- Rate-limit user-facing estimate requests at the Recommendation
  Service.
- Never log credentials or raw sensitive features.
- ML unavailability does not affect catalog, search, details,
  recommendations, comparison, or favorites.

## 7. Non-predictive fallback

If reliable labels are unavailable, a separately approved
non-predictive ownership suitability score may consider documented
inputs such as available maintenance-cost estimates or user-selected
usage fit only when those inputs have known provenance and comparable
units.

Requirements:

- Label it “ownership suitability” or “heuristic,” not “AI,” “ML,”
  “longevity prediction,” “lifespan,” or failure probability.
- Describe which rules and data fields were used.
- Report missing evidence; do not infer reliability from make/model or
  other unsupported proxies.
- Return no score when required evidence is unavailable.
- Keep this heuristic separate from any predictive model API and
  version its rules.

The PRD leaves this MVP choice open. If the product owner does not
approve the heuristic, omit longevity output entirely.

## 8. User communication

Any enabled experimental estimate must explain:

- The exact outcome target and prediction horizon.
- The population/data coverage to which the model was evaluated.
- Uncertainty in a form supported by evaluation.
- Important missing input data and out-of-scope populations.
- That an estimate is not a guarantee and does not establish
  causation.
- Model version and last validation/review date when appropriate.

Do not translate a generic model score into a remaining lifespan,
reliability guarantee, or major-repair probability unless that exact
target was defined and evaluated.

## 9. Approval gates before implementation

1. Approve one target and time horizon.
2. Identify an authorized data source and document labels, coverage,
   censoring, missingness, and source limitations.
3. Approve input features available at inference time and privacy basis.
4. Approve split design, baseline, candidate models, metrics, and
   subgroup/bias review.
5. Review reproducible evaluation evidence and define deployment
   acceptance criteria.
6. Approve API schema, service identity, network boundary, timeout, and
   operational ownership.
7. Decide whether the MVP omits longevity or includes a separate
   non-predictive heuristic.

Until all required gates pass, the endpoint remains disabled and no
predictive output is returned.

## 10. Review gate

This document describes a future experimental pathway, not an
implemented model or demonstrated prediction capability. Review the
target/data gates and decide whether the first implementation should
omit longevity functionality or include an approved non-predictive
heuristic.
