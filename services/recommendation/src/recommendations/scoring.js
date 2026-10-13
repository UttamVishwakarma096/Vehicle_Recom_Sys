import {
  RULE_VERSION,
  COVERAGE_THRESHOLD,
  SCORE_DISCLAIMER,
  DEFAULT_PRIORITIES,
} from "./config.js";

export function scoreCandidate(candidate, preferences = {}) {
  const componentScores = {};
  const scoredWeights = [];
  const activeWeights = [];

  const reasons = [];
  const tradeoffs = [];
  const missingData = [];

  const priorities = {
    ...DEFAULT_PRIORITIES,
    ...(preferences.priorities || {}),
  };

  // 1. Budget Fit Dimension
  if (preferences.budget) {
    const { min = 0, max, priceType = "ex_showroom" } = preferences.budget;
    const prices = Array.isArray(candidate.prices) ? candidate.prices : [];
    const matchedPrice = prices.find((p) => p.type === priceType && p.currency === "INR");

    const budgetWeight = 1.0;
    activeWeights.push(budgetWeight);

    if (matchedPrice) {
      const amount = Number(
        matchedPrice.amount.toString ? matchedPrice.amount.toString() : matchedPrice.amount,
      );

      let score = 100;
      if (max !== undefined && max > min) {
        score = Math.round((100 * (max - amount)) / (max - min));
        score = Math.max(0, Math.min(100, score));
      } else if (max !== undefined && max === min) {
        score = amount === min ? 100 : 0;
      }

      componentScores.budgetFit = score;
      scoredWeights.push({ score, weight: budgetWeight });

      reasons.push({
        code: "WITHIN_BUDGET",
        label: `Fits within requested ${priceType} budget (${amount} INR).`,
      });
    } else {
      missingData.push({
        dimension: "budgetFit",
        reason: `No verified ${priceType} price in INR is available for candidate.`,
      });
    }
  }

  // 2. Fuel Efficiency Dimension
  const fuelPriority = priorities.fuelEfficiency;
  if (fuelPriority > 0) {
    const weight = fuelPriority / 5;
    activeWeights.push(weight);

    const mileage =
      candidate.specifications?.claimedMileage?.value ||
      candidate.specifications?.measuredMileage?.value;

    if (typeof mileage === "number" && mileage > 0) {
      // Benchmark: 25 kmpl represents 100
      const score = Math.min(100, Math.max(0, Math.round((mileage / 25) * 100)));
      componentScores.fuelEfficiency = score;
      scoredWeights.push({ score, weight });

      reasons.push({
        code: "FUEL_EFFICIENT",
        label: `Verified mileage of ${mileage} km/l aligns with fuel efficiency priority.`,
      });
    } else {
      missingData.push({
        dimension: "fuelEfficiency",
        reason: "No comparable verified mileage specification is available.",
      });
    }
  }

  // 3. Performance Dimension
  const perfPriority = priorities.performance;
  if (perfPriority > 0) {
    const weight = perfPriority / 5;
    activeWeights.push(weight);

    const power = candidate.specifications?.power?.value;
    if (typeof power === "number" && power > 0) {
      // Benchmark: 200 hp represents 100
      const score = Math.min(100, Math.max(0, Math.round((power / 200) * 100)));
      componentScores.performance = score;
      scoredWeights.push({ score, weight });

      reasons.push({
        code: "POWERFUL_ENGINE",
        label: `Verified engine power of ${power} aligns with performance priority.`,
      });
    } else {
      missingData.push({
        dimension: "performance",
        reason: "No verified engine power specification is available in catalog.",
      });
    }
  }

  // 4. Soft Dimensions without Approved Ground Truth Evidence (Safety, Reliability, Maintenance)
  // Per Section 4 of 07_RECOMMENDATION_ENGINE.md, scores are not invented without approved ground truth
  for (const dim of ["safety", "reliability", "maintenanceCost"]) {
    const p = priorities[dim];
    if (p > 0) {
      const weight = p / 5;
      activeWeights.push(weight);
      missingData.push({
        dimension: dim,
        reason: `Authorized data source and verified evaluation scale for ${dim} are not yet active in MVP.`,
      });
    }
  }

  // Soft preference trade-offs
  if (preferences.vehicleTypes?.length && candidate.bodyType) {
    if (!preferences.vehicleTypes.includes(candidate.bodyType)) {
      tradeoffs.push({
        code: "BODY_TYPE_DIFFERENCE",
        label: `Body type '${candidate.bodyType}' differs from preferred types.`,
      });
    }
  }

  // Calculate Weighted Evidence Coverage
  const totalActiveWeight = activeWeights.reduce((acc, w) => acc + w, 0);
  const totalScoredWeight = scoredWeights.reduce((acc, sw) => acc + sw.weight, 0);

  const evidenceCoverage =
    totalActiveWeight > 0 ? Number((totalScoredWeight / totalActiveWeight).toFixed(2)) : 0;

  let matchScore = null;
  let scoreStatus = "insufficient_data";

  if (evidenceCoverage >= COVERAGE_THRESHOLD && totalScoredWeight > 0) {
    const weightedSum = scoredWeights.reduce((acc, sw) => acc + sw.score * sw.weight, 0);
    matchScore = Math.round(weightedSum / totalScoredWeight);
    scoreStatus = "scored";
  }

  return {
    vehicle: candidate,
    matchScore,
    scoreStatus,
    evidenceCoverage,
    componentScores,
    reasons,
    tradeoffs,
    missingData,
    ruleVersion: RULE_VERSION,
    disclaimer: SCORE_DISCLAIMER,
  };
}
