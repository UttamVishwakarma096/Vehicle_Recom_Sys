export const RULE_VERSION = "rules-v1";

export const COVERAGE_THRESHOLD = 0.5; // 50% minimum evidence coverage for numeric score

export const ALLOWED_PRIORITY_KEYS = [
  "reliability",
  "maintenanceCost",
  "fuelEfficiency",
  "safety",
  "performance",
];

export const PRIORITY_BOUNDS = {
  min: 1,
  max: 5,
};

export const DEFAULT_PRIORITIES = {
  reliability: 3,
  maintenanceCost: 3,
  fuelEfficiency: 3,
  safety: 3,
  performance: 3,
};

export const SCORE_DISCLAIMER =
  "Preference match scores represent rule-based compatibility with your submitted preferences, not a guarantee, probability, or lifespan prediction.";
