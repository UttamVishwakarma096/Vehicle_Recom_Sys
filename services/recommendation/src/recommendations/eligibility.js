export function evaluateEligibility(
  candidate,
  preferences = {},
  { strictFields = new Set(["budget", "minimumSeats"]) } = {},
) {
  const ineligibilityReasons = [];

  if (!candidate) {
    return { eligible: false, reasons: [{ code: "INVALID_CANDIDATE", message: "Missing candidate." }] };
  }

  // 1. Budget Constraint
  if (preferences.budget && (strictFields.has("budget") || preferences.budget.isStrict)) {
    const { min, max, priceType = "ex_showroom" } = preferences.budget;
    const prices = Array.isArray(candidate.prices) ? candidate.prices : [];
    const matchedPrice = prices.find((p) => p.type === priceType && p.currency === "INR");

    if (!matchedPrice) {
      ineligibilityReasons.push({
        code: "MISSING_PRICE",
        message: `Candidate has no known verified ${priceType} price in INR.`,
      });
    } else {
      const amount = Number(matchedPrice.amount.toString ? matchedPrice.amount.toString() : matchedPrice.amount);
      if (min !== undefined && amount < min) {
        ineligibilityReasons.push({
          code: "BUDGET_BELOW_MIN",
          message: `Vehicle price (${amount} INR) is below requested minimum (${min} INR).`,
        });
      }
      if (max !== undefined && amount > max) {
        ineligibilityReasons.push({
          code: "BUDGET_EXCEEDED",
          message: `Vehicle price (${amount} INR) exceeds requested maximum (${max} INR).`,
        });
      }
    }
  }

  // 2. Minimum Seats Constraint
  if (preferences.minimumSeats && (strictFields.has("minimumSeats") || preferences.minimumSeatsStrict)) {
    const seats = candidate.seatingCapacity;
    if (seats === undefined || seats === null) {
      ineligibilityReasons.push({
        code: "MISSING_SEATS",
        message: "Candidate has no known seating capacity to satisfy strict requirement.",
      });
    } else if (seats < preferences.minimumSeats) {
      ineligibilityReasons.push({
        code: "INSUFFICIENT_SEATS",
        message: `Candidate seating capacity (${seats}) is below required minimum (${preferences.minimumSeats}).`,
      });
    }
  }

  // 3. Vehicle Types Constraint
  if (
    Array.isArray(preferences.vehicleTypes) &&
    preferences.vehicleTypes.length > 0 &&
    (strictFields.has("vehicleTypes") || preferences.vehicleTypesStrict)
  ) {
    const bodyType = candidate.bodyType;
    if (!bodyType) {
      ineligibilityReasons.push({
        code: "MISSING_BODY_TYPE",
        message: "Candidate has no known body type to satisfy strict requirement.",
      });
    } else if (!preferences.vehicleTypes.includes(bodyType)) {
      ineligibilityReasons.push({
        code: "BODY_TYPE_MISMATCH",
        message: `Candidate body type '${bodyType}' is not among required types.`,
      });
    }
  }

  // 4. Fuel Types Constraint
  if (
    Array.isArray(preferences.fuelTypes) &&
    preferences.fuelTypes.length > 0 &&
    (strictFields.has("fuelTypes") || preferences.fuelTypesStrict)
  ) {
    const fuelType = candidate.fuelType;
    if (!fuelType) {
      ineligibilityReasons.push({
        code: "MISSING_FUEL_TYPE",
        message: "Candidate has no known fuel type to satisfy strict requirement.",
      });
    } else if (!preferences.fuelTypes.includes(fuelType)) {
      ineligibilityReasons.push({
        code: "FUEL_TYPE_MISMATCH",
        message: `Candidate fuel type '${fuelType}' is not among required types.`,
      });
    }
  }

  // 5. Transmissions Constraint
  if (
    Array.isArray(preferences.transmissions) &&
    preferences.transmissions.length > 0 &&
    (strictFields.has("transmissions") || preferences.transmissionsStrict)
  ) {
    const transmission = candidate.transmission;
    if (!transmission) {
      ineligibilityReasons.push({
        code: "MISSING_TRANSMISSION",
        message: "Candidate has no known transmission to satisfy strict requirement.",
      });
    } else if (!preferences.transmissions.includes(transmission)) {
      ineligibilityReasons.push({
        code: "TRANSMISSION_MISMATCH",
        message: `Candidate transmission '${transmission}' is not among required types.`,
      });
    }
  }

  return {
    eligible: ineligibilityReasons.length === 0,
    reasons: ineligibilityReasons,
  };
}
