import { RULE_VERSION, SCORE_DISCLAIMER } from "./config.js";
import { evaluateEligibility } from "./eligibility.js";
import { scoreCandidate } from "./scoring.js";

function tieBreaker(a, b) {
  const vA = a.vehicle;
  const vB = b.vehicle;

  // 1. Make
  const makeDiff = (vA.make || "").localeCompare(vB.make || "");
  if (makeDiff !== 0) return makeDiff;

  // 2. Model
  const modelDiff = (vA.model || "").localeCompare(vB.model || "");
  if (modelDiff !== 0) return modelDiff;

  // 3. Model Year (descending)
  const yearA = vA.modelYear || 0;
  const yearB = vB.modelYear || 0;
  if (yearB !== yearA) return yearB - yearA;

  // 4. Stable Opaque ID
  const idA = (vA.id || vA._id || "").toString();
  const idB = (vB.id || vB._id || "").toString();
  return idA.localeCompare(idB);
}

export function rankCandidates(candidates = [], preferences = {}, options = {}) {
  const eligible = [];
  const ineligible = [];

  for (const candidate of candidates) {
    const { eligible: isEligible, reasons } = evaluateEligibility(candidate, preferences, options);
    if (isEligible) {
      eligible.push(candidate);
    } else {
      ineligible.push({ candidate, reasons });
    }
  }

  const scoredCandidates = eligible.map((c) => scoreCandidate(c, preferences));

  const scoredGroup = scoredCandidates.filter((item) => item.scoreStatus === "scored");
  const insufficientGroup = scoredCandidates.filter((item) => item.scoreStatus !== "scored");

  // Sort scored by matchScore descending, then tie-breaker
  scoredGroup.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return tieBreaker(a, b);
  });

  // Sort insufficient group by tie-breaker
  insufficientGroup.sort(tieBreaker);

  const combined = [...scoredGroup, ...insufficientGroup];

  const results = combined.map((item, index) => ({
    rank: index + 1,
    ...item,
  }));

  return {
    results,
    totalEligible: eligible.length,
    totalIneligible: ineligible.length,
    ruleVersion: RULE_VERSION,
    disclaimer: SCORE_DISCLAIMER,
  };
}
