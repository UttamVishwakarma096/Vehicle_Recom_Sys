import { ALLOWED_PRIORITY_KEYS, PRIORITY_BOUNDS } from "./config.js";

export const ALLOWED_BODY_TYPES = [
  "hatchback",
  "sedan",
  "suv",
  "muv",
  "coupe",
  "convertible",
  "wagon",
  "pickup",
];

export const ALLOWED_FUEL_TYPES = [
  "petrol",
  "diesel",
  "cng",
  "electric",
  "hybrid",
  "lpg",
];

export const ALLOWED_TRANSMISSIONS = ["manual", "automatic"];

export const ALLOWED_PRICE_TYPES = ["ex_showroom", "on_road", "used"];

export const ALLOWED_ENVIRONMENTS = ["city", "highway", "mixed"];

const ALLOWED_PREFERENCE_KEYS = new Set([
  "budget",
  "vehicleTypes",
  "fuelTypes",
  "transmissions",
  "minimumSeats",
  "drivingEnvironment",
  "annualDistanceKm",
  "priorities",
]);

export function validateRecommendationRequest(body) {
  const fieldErrors = [];

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      isValid: false,
      fieldErrors: [
        {
          field: "body",
          code: "INVALID_FORMAT",
          message: "Request body must be a JSON object.",
        },
      ],
    };
  }

  // Support either body.preferences or root body
  const prefs = body.preferences !== undefined ? body.preferences : body;

  if (typeof prefs !== "object" || prefs === null || Array.isArray(prefs)) {
    return {
      isValid: false,
      fieldErrors: [
        {
          field: "preferences",
          code: "INVALID_FORMAT",
          message: "Preferences must be an object.",
        },
      ],
    };
  }

  for (const key of Object.keys(prefs)) {
    if (!ALLOWED_PREFERENCE_KEYS.has(key)) {
      fieldErrors.push({
        field: key,
        code: "UNRECOGNIZED_FIELD",
        message: `Field '${key}' is not an allowed preference field.`,
      });
    }
  }

  // Budget validation
  if (prefs.budget !== undefined) {
    if (typeof prefs.budget !== "object" || prefs.budget === null || Array.isArray(prefs.budget)) {
      fieldErrors.push({
        field: "budget",
        code: "INVALID_FORMAT",
        message: "Budget must be an object.",
      });
    } else {
      const { min, max, priceType, currency } = prefs.budget;

      if (priceType !== undefined && !ALLOWED_PRICE_TYPES.includes(priceType)) {
        fieldErrors.push({
          field: "budget.priceType",
          code: "INVALID_VALUE",
          message: `priceType must be one of: ${ALLOWED_PRICE_TYPES.join(", ")}.`,
        });
      }

      if (currency !== undefined && currency !== "INR") {
        fieldErrors.push({
          field: "budget.currency",
          code: "INVALID_VALUE",
          message: "currency must be 'INR'.",
        });
      }

      if (min !== undefined) {
        if (typeof min !== "number" || !Number.isFinite(min) || min < 0) {
          fieldErrors.push({
            field: "budget.min",
            code: "INVALID_VALUE",
            message: "budget.min must be a finite non-negative number.",
          });
        }
      }

      if (max !== undefined) {
        if (typeof max !== "number" || !Number.isFinite(max) || max <= 0) {
          fieldErrors.push({
            field: "budget.max",
            code: "INVALID_VALUE",
            message: "budget.max must be a finite positive number greater than zero.",
          });
        }
      }

      if (
        min !== undefined &&
        max !== undefined &&
        typeof min === "number" &&
        typeof max === "number" &&
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        min > max
      ) {
        fieldErrors.push({
          field: "budget.min",
          code: "INVALID_RANGE",
          message: "budget.min cannot exceed budget.max.",
        });
      }
    }
  }

  // Vehicle types
  if (prefs.vehicleTypes !== undefined) {
    if (
      !Array.isArray(prefs.vehicleTypes) ||
      prefs.vehicleTypes.some((t) => typeof t !== "string" || !ALLOWED_BODY_TYPES.includes(t))
    ) {
      fieldErrors.push({
        field: "vehicleTypes",
        code: "INVALID_VALUE",
        message: `vehicleTypes must be an array of: ${ALLOWED_BODY_TYPES.join(", ")}.`,
      });
    }
  }

  // Fuel types
  if (prefs.fuelTypes !== undefined) {
    if (
      !Array.isArray(prefs.fuelTypes) ||
      prefs.fuelTypes.some((f) => typeof f !== "string" || !ALLOWED_FUEL_TYPES.includes(f))
    ) {
      fieldErrors.push({
        field: "fuelTypes",
        code: "INVALID_VALUE",
        message: `fuelTypes must be an array of: ${ALLOWED_FUEL_TYPES.join(", ")}.`,
      });
    }
  }

  // Transmissions
  if (prefs.transmissions !== undefined) {
    if (
      !Array.isArray(prefs.transmissions) ||
      prefs.transmissions.some((t) => typeof t !== "string" || !ALLOWED_TRANSMISSIONS.includes(t))
    ) {
      fieldErrors.push({
        field: "transmissions",
        code: "INVALID_VALUE",
        message: `transmissions must be an array of: ${ALLOWED_TRANSMISSIONS.join(", ")}.`,
      });
    }
  }

  // Minimum seats
  if (prefs.minimumSeats !== undefined) {
    if (
      typeof prefs.minimumSeats !== "number" ||
      !Number.isInteger(prefs.minimumSeats) ||
      prefs.minimumSeats < 1
    ) {
      fieldErrors.push({
        field: "minimumSeats",
        code: "INVALID_VALUE",
        message: "minimumSeats must be an integer greater than or equal to 1.",
      });
    }
  }

  // Driving environment
  if (prefs.drivingEnvironment !== undefined) {
    if (!ALLOWED_ENVIRONMENTS.includes(prefs.drivingEnvironment)) {
      fieldErrors.push({
        field: "drivingEnvironment",
        code: "INVALID_VALUE",
        message: `drivingEnvironment must be one of: ${ALLOWED_ENVIRONMENTS.join(", ")}.`,
      });
    }
  }

  // Annual distance
  if (prefs.annualDistanceKm !== undefined) {
    if (
      typeof prefs.annualDistanceKm !== "number" ||
      !Number.isFinite(prefs.annualDistanceKm) ||
      prefs.annualDistanceKm <= 0
    ) {
      fieldErrors.push({
        field: "annualDistanceKm",
        code: "INVALID_VALUE",
        message: "annualDistanceKm must be a positive number.",
      });
    }
  }

  // Priorities
  if (prefs.priorities !== undefined) {
    if (typeof prefs.priorities !== "object" || prefs.priorities === null || Array.isArray(prefs.priorities)) {
      fieldErrors.push({
        field: "priorities",
        code: "INVALID_FORMAT",
        message: "priorities must be an object.",
      });
    } else {
      for (const [key, value] of Object.entries(prefs.priorities)) {
        if (!ALLOWED_PRIORITY_KEYS.includes(key)) {
          fieldErrors.push({
            field: `priorities.${key}`,
            code: "UNRECOGNIZED_FIELD",
            message: `Priority '${key}' is not allowed. Must be one of: ${ALLOWED_PRIORITY_KEYS.join(", ")}.`,
          });
          continue;
        }

        if (
          typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < PRIORITY_BOUNDS.min ||
          value > PRIORITY_BOUNDS.max
        ) {
          fieldErrors.push({
            field: `priorities.${key}`,
            code: "INVALID_VALUE",
            message: `Priority '${key}' must be an integer between ${PRIORITY_BOUNDS.min} and ${PRIORITY_BOUNDS.max}.`,
          });
        }
      }
    }
  }

  return {
    isValid: fieldErrors.length === 0,
    fieldErrors,
    preferences: prefs,
  };
}
