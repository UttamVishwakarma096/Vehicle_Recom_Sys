import assert from "node:assert/strict";
import { test } from "node:test";
import { validateRecommendationRequest } from "../src/recommendations/validation.js";
import { evaluateEligibility } from "../src/recommendations/eligibility.js";
import { scoreCandidate } from "../src/recommendations/scoring.js";
import { rankCandidates } from "../src/recommendations/ranking.js";
import { RULE_VERSION, SCORE_DISCLAIMER } from "../src/recommendations/config.js";

// Helper to create synthetic vehicles for engine testing
function createTestVehicle(overrides = {}) {
  const {
    id = "veh-1",
    make = "Tata",
    model = "Nexon",
    modelYear = 2024,
    bodyType = "suv",
    transmission = "manual",
    exShowroom = 1000000,
  } = overrides;

  const seatingCapacity = "seatingCapacity" in overrides ? overrides.seatingCapacity : 5;
  const fuelType = "fuelType" in overrides ? overrides.fuelType : "petrol";
  const mileage = "mileage" in overrides ? overrides.mileage : 18;
  const power = "power" in overrides ? overrides.power : 120;

  const prices = [];
  if (exShowroom !== undefined && exShowroom !== null) {
    prices.push({ type: "ex_showroom", amount: exShowroom, currency: "INR" });
  }

  const specifications = {};
  if (mileage !== undefined && mileage !== null) {
    specifications.claimedMileage = { value: mileage, unit: "kmpl" };
  }
  if (power !== undefined && power !== null) {
    specifications.power = { value: power, unit: "hp" };
  }

  return {
    id,
    _id: id,
    make,
    model,
    modelYear,
    bodyType,
    fuelType,
    transmission,
    seatingCapacity,
    prices,
    specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
    status: "published",
  };
}

// REC-01: FR-REC-01 - Submit valid hard/soft preference request -> normalized and valid
test("REC-01: valid recommendation preference request validates and normalizes cleanly", () => {
  const validRequest = {
    budget: {
      min: 500000,
      max: 1200000,
      currency: "INR",
      priceType: "ex_showroom",
    },
    vehicleTypes: ["suv"],
    fuelTypes: ["petrol", "diesel"],
    transmissions: ["manual"],
    minimumSeats: 5,
    drivingEnvironment: "mixed",
    annualDistanceKm: 12000,
    priorities: {
      fuelEfficiency: 4,
      performance: 3,
      safety: 4,
    },
  };

  const validation = validateRecommendationRequest(validRequest);
  assert.equal(validation.isValid, true);
  assert.equal(validation.fieldErrors.length, 0);
  assert.equal(validation.preferences.budget.min, 500000);
});

// REC-02: FR-REC-01 - Invalid fields, reversed budget, invalid priority rejected with field-specific 400
test("REC-02: invalid budget, reversed range, and invalid priorities produce field errors", () => {
  // Reversed budget (min > max)
  const reversedBudget = {
    budget: { min: 1000000, max: 500000, priceType: "ex_showroom", currency: "INR" },
  };
  const res1 = validateRecommendationRequest(reversedBudget);
  assert.equal(res1.isValid, false);
  assert.ok(res1.fieldErrors.some((fe) => fe.field === "budget.min" && fe.code === "INVALID_RANGE"));

  // Negative amount
  const negativeBudget = {
    budget: { min: -100, max: 500000, priceType: "ex_showroom", currency: "INR" },
  };
  const res2 = validateRecommendationRequest(negativeBudget);
  assert.equal(res2.isValid, false);
  assert.ok(res2.fieldErrors.some((fe) => fe.field === "budget.min"));

  // Invalid priority outside [1, 5]
  const badPriority = {
    priorities: { fuelEfficiency: 10 },
  };
  const res3 = validateRecommendationRequest(badPriority);
  assert.equal(res3.isValid, false);
  assert.ok(res3.fieldErrors.some((fe) => fe.field === "priorities.fuelEfficiency"));

  // Unrecognized field
  const unknownField = {
    hackerField: "malicious",
  };
  const res4 = validateRecommendationRequest(unknownField);
  assert.equal(res4.isValid, false);
  assert.ok(res4.fieldErrors.some((fe) => fe.field === "hackerField"));
});

// REC-03: FR-REC-02 - Inclusive budget boundaries, one below, one above, wrong price type
test("REC-03: inclusive budget boundaries and price type compatibility", () => {
  const budget = { min: 800000, max: 1200000, priceType: "ex_showroom" };
  const prefs = { budget };

  // 1. Exactly at min bound -> eligible
  const atMin = createTestVehicle({ id: "v-min", exShowroom: 800000 });
  assert.equal(evaluateEligibility(atMin, prefs).eligible, true);

  // 2. Exactly at max bound -> eligible
  const atMax = createTestVehicle({ id: "v-max", exShowroom: 1200000 });
  assert.equal(evaluateEligibility(atMax, prefs).eligible, true);

  // 3. Below min bound -> ineligible
  const belowMin = createTestVehicle({ id: "v-below", exShowroom: 799999 });
  const evalBelow = evaluateEligibility(belowMin, prefs);
  assert.equal(evalBelow.eligible, false);
  assert.ok(evalBelow.reasons.some((r) => r.code === "BUDGET_BELOW_MIN"));

  // 4. Above max bound -> ineligible
  const aboveMax = createTestVehicle({ id: "v-above", exShowroom: 1200001 });
  const evalAbove = evaluateEligibility(aboveMax, prefs);
  assert.equal(evalAbove.eligible, false);
  assert.ok(evalAbove.reasons.some((r) => r.code === "BUDGET_EXCEEDED"));

  // 5. Wrong price type (only has on_road, no ex_showroom) -> ineligible
  const wrongType = {
    id: "v-wrong",
    prices: [{ type: "on_road", amount: 1000000, currency: "INR" }],
  };
  const evalWrong = evaluateEligibility(wrongType, prefs);
  assert.equal(evalWrong.eligible, false);
  assert.ok(evalWrong.reasons.some((r) => r.code === "MISSING_PRICE"));
});

// REC-04: FR-REC-02 - Candidate has missing strict fuel/seating/type -> marked ineligible, not inferred
test("REC-04: missing mandatory field is ineligible; value is never inferred", () => {
  // Required minimumSeats=7, candidate has undefined seatingCapacity
  const candidateNoSeats = createTestVehicle({ id: "v-no-seats", seatingCapacity: undefined });
  const prefsSeats = { minimumSeats: 7, minimumSeatsStrict: true };
  const evalSeats = evaluateEligibility(candidateNoSeats, prefsSeats);
  assert.equal(evalSeats.eligible, false);
  assert.ok(evalSeats.reasons.some((r) => r.code === "MISSING_SEATS"));

  // Required fuelTypes=["diesel"], candidate has undefined fuelType
  const candidateNoFuel = createTestVehicle({ id: "v-no-fuel", fuelType: undefined });
  const prefsFuel = { fuelTypes: ["diesel"], fuelTypesStrict: true };
  const evalFuel = evaluateEligibility(candidateNoFuel, prefsFuel);
  assert.equal(evalFuel.eligible, false);
  assert.ok(evalFuel.reasons.some((r) => r.code === "MISSING_FUEL_TYPE"));
});

// REC-05: FR-REC-02 - Hard mismatch excluded; soft mismatch remains eligible
test("REC-05: hard constraint mismatch is excluded while soft preference mismatch remains eligible", () => {
  const strictSedan = createTestVehicle({ id: "v-suv", bodyType: "suv" });

  // When vehicleTypes is a hard constraint -> excluded
  const strictPrefs = { vehicleTypes: ["sedan"], vehicleTypesStrict: true };
  const strictEval = evaluateEligibility(strictSedan, strictPrefs);
  assert.equal(strictEval.eligible, false);

  // When vehicleTypes is a soft preference -> eligible, but records tradeoff in score
  const softPrefs = { vehicleTypes: ["sedan"] };
  const softEval = evaluateEligibility(strictSedan, softPrefs, { strictFields: new Set(["budget"]) });
  assert.equal(softEval.eligible, true);

  const scored = scoreCandidate(strictSedan, softPrefs);
  assert.ok(scored.tradeoffs.some((t) => t.code === "BODY_TYPE_DIFFERENCE"));
});

// REC-06: FR-REC-03 - Deterministic ranking replay
test("REC-06: repeated ranking with identical catalog and preferences produces identical scores, order, and rule version", () => {
  const candidates = [
    createTestVehicle({ id: "v-1", model: "Nexon", exShowroom: 900000, mileage: 18, power: 120 }),
    createTestVehicle({ id: "v-2", model: "Creta", exShowroom: 1100000, mileage: 21, power: 115 }),
    createTestVehicle({ id: "v-3", model: "Swift", exShowroom: 650000, mileage: 24, power: 90 }),
  ];

  const preferences = {
    budget: { min: 500000, max: 1200000, priceType: "ex_showroom" },
    priorities: { fuelEfficiency: 5, performance: 3 },
  };

  const run1 = rankCandidates(candidates, preferences);
  const run2 = rankCandidates(candidates, preferences);

  assert.equal(run1.ruleVersion, RULE_VERSION);
  assert.equal(run2.ruleVersion, RULE_VERSION);
  assert.equal(run1.results.length, run2.results.length);

  for (let i = 0; i < run1.results.length; i++) {
    assert.equal(run1.results[i].rank, run2.results[i].rank);
    assert.equal(run1.results[i].vehicle.id, run2.results[i].vehicle.id);
    assert.equal(run1.results[i].matchScore, run2.results[i].matchScore);
    assert.equal(run1.results[i].scoreStatus, run2.results[i].scoreStatus);
    assert.deepEqual(run1.results[i].componentScores, run2.results[i].componentScores);
  }
});

// REC-07: FR-REC-03 - Equal-score synthetic candidates produce stable approved tie-break order
test("REC-07: identical match scores resolve using stable deterministic tie-breaker", () => {
  // Two candidates with identical scores and prices, differing by make/model/id
  const candA = createTestVehicle({ id: "veh-B", make: "Tata", model: "Nexon", exShowroom: 1000000 });
  const candB = createTestVehicle({ id: "veh-A", make: "Hyundai", model: "Creta", exShowroom: 1000000 });

  const prefs = {
    budget: { min: 500000, max: 1500000, priceType: "ex_showroom" },
  };

  const ranked = rankCandidates([candA, candB], prefs);
  assert.equal(ranked.results.length, 2);
  assert.equal(ranked.results[0].matchScore, ranked.results[1].matchScore);

  // Hyundai precedes Tata alphabetically
  assert.equal(ranked.results[0].vehicle.make, "Hyundai");
  assert.equal(ranked.results[1].vehicle.make, "Tata");
});

// REC-08: FR-REC-03/04 - Evidence coverage above and below threshold
test("REC-08: candidates above coverage threshold are scored; below threshold marked insufficient_data", () => {
  // Vehicle with full evidence (budget, mileage, power)
  const fullEvidence = createTestVehicle({
    id: "v-full",
    exShowroom: 900000,
    mileage: 20,
    power: 140,
  });

  // Vehicle with only budget (missing mileage and power, while user heavily prioritized them)
  const lowEvidence = createTestVehicle({
    id: "v-low",
    exShowroom: 900000,
    mileage: undefined,
    power: undefined,
  });

  const heavyPriorities = {
    budget: { min: 500000, max: 1500000, priceType: "ex_showroom" },
    priorities: {
      fuelEfficiency: 5,
      performance: 5,
      safety: 5,
      reliability: 5,
    },
  };

  const ranked = rankCandidates([fullEvidence, lowEvidence], heavyPriorities);

  // fullEvidence has budget, fuel, power -> meets 50% coverage -> scoreStatus: "scored"
  const fullResult = ranked.results.find((r) => r.vehicle.id === "v-full");
  assert.ok(fullResult);
  assert.equal(fullResult.scoreStatus, "scored");
  assert.ok(typeof fullResult.matchScore === "number");

  // lowEvidence has only budget -> below 50% coverage -> scoreStatus: "insufficient_data"
  const lowResult = ranked.results.find((r) => r.vehicle.id === "v-low");
  assert.ok(lowResult);
  assert.equal(lowResult.scoreStatus, "insufficient_data");
  assert.equal(lowResult.matchScore, null);
  assert.ok(lowResult.missingData.length > 0);
});

// REC-09: FR-REC-04 - Explanations, trade-offs, and disclaimer present
test("REC-09: every result includes match reasons, missing evidence warnings, and mandatory disclaimer", () => {
  const vehicle = createTestVehicle({
    id: "v-exp",
    exShowroom: 950000,
    mileage: 22,
    power: undefined,
  });

  const prefs = {
    budget: { min: 500000, max: 1200000, priceType: "ex_showroom" },
    priorities: { fuelEfficiency: 4, performance: 4 },
  };

  const result = scoreCandidate(vehicle, prefs);

  assert.ok(result.reasons.some((r) => r.code === "WITHIN_BUDGET"));
  assert.ok(result.reasons.some((r) => r.code === "FUEL_EFFICIENT"));
  assert.ok(result.missingData.some((m) => m.dimension === "performance"));
  assert.equal(result.disclaimer, SCORE_DISCLAIMER);
});

// REC-10: FR-REC-02 - Empty result when no candidates qualify without relaxing constraints
test("REC-10: returns empty result with totalIneligible count when no vehicles satisfy constraints", () => {
  const expensiveVehicles = [
    createTestVehicle({ id: "v-1", exShowroom: 2500000 }),
    createTestVehicle({ id: "v-2", exShowroom: 3000000 }),
  ];

  const cheapBudget = {
    budget: { min: 500000, max: 1000000, priceType: "ex_showroom" },
  };

  const ranked = rankCandidates(expensiveVehicles, cheapBudget);
  assert.equal(ranked.results.length, 0);
  assert.equal(ranked.totalEligible, 0);
  assert.equal(ranked.totalIneligible, 2);
});
