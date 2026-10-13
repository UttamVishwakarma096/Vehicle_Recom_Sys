import { Router } from "express";
import { HttpError } from "../foundation.js";

const ALLOWED_PROFILE_KEYS = new Set(["displayName", "city"]);
const FORBIDDEN_MUTATION_KEYS = new Set(["role", "_id", "email", "passwordHash"]);

const ALLOWED_VEHICLE_TYPES = new Set(["hatchback", "sedan", "suv", "muv", "coupe", "convertible"]);
const ALLOWED_FUEL_TYPES = new Set(["petrol", "diesel", "cng", "electric", "hybrid"]);
const ALLOWED_TRANSMISSIONS = new Set(["manual", "automatic"]);
const ALLOWED_ENVIRONMENTS = new Set(["city", "highway", "mixed"]);
const ALLOWED_PRICE_TYPES = new Set(["ex_showroom", "on_road", "used"]);
const ALLOWED_PRIORITY_KEYS = new Set([
  "reliability",
  "maintenanceCost",
  "fuelEfficiency",
  "safety",
  "performance",
]);
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

function validatePreferences(body) {
  const fieldErrors = [];
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return [
      { field: "preferences", code: "INVALID_FORMAT", message: "Preferences must be an object." },
    ];
  }

  for (const key of Object.keys(body)) {
    if (!ALLOWED_PREFERENCE_KEYS.has(key)) {
      fieldErrors.push({
        field: key,
        code: "UNRECOGNIZED_FIELD",
        message: `Field '${key}' is not an allowed preference field.`,
      });
    }
  }

  if (body.budget !== undefined) {
    if (typeof body.budget !== "object" || body.budget === null || Array.isArray(body.budget)) {
      fieldErrors.push({
        field: "budget",
        code: "INVALID_FORMAT",
        message: "Budget must be an object.",
      });
    } else {
      const { min, max, priceType, ...extraBudget } = body.budget;
      for (const k of Object.keys(extraBudget)) {
        fieldErrors.push({
          field: `budget.${k}`,
          code: "UNRECOGNIZED_FIELD",
          message: `Field 'budget.${k}' is not permitted.`,
        });
      }

      if (min !== undefined) {
        if (typeof min !== "number" || !Number.isFinite(min) || min < 0) {
          fieldErrors.push({
            field: "budget.min",
            code: "INVALID_AMOUNT",
            message: "Minimum budget must be a non-negative number.",
          });
        }
      }

      if (max !== undefined) {
        if (typeof max !== "number" || !Number.isFinite(max) || max < 0) {
          fieldErrors.push({
            field: "budget.max",
            code: "INVALID_AMOUNT",
            message: "Maximum budget must be a non-negative number.",
          });
        }
      }

      if (min !== undefined && max !== undefined && Number.isFinite(min) && Number.isFinite(max)) {
        if (max < min) {
          fieldErrors.push({
            field: "budget.max",
            code: "MUST_BE_AT_LEAST_MIN",
            message: "Maximum budget must be greater than or equal to minimum budget.",
          });
        }
      }

      if (min !== undefined || max !== undefined) {
        if (!priceType || !ALLOWED_PRICE_TYPES.has(priceType)) {
          fieldErrors.push({
            field: "budget.priceType",
            code: "INVALID_PRICE_TYPE",
            message: "Price type must be 'ex_showroom', 'on_road', or 'used'.",
          });
        }
      }
    }
  }

  if (body.vehicleTypes !== undefined) {
    if (!Array.isArray(body.vehicleTypes)) {
      fieldErrors.push({
        field: "vehicleTypes",
        code: "INVALID_FORMAT",
        message: "Vehicle types must be an array of strings.",
      });
    } else {
      for (const t of body.vehicleTypes) {
        if (!ALLOWED_VEHICLE_TYPES.has(t)) {
          fieldErrors.push({
            field: "vehicleTypes",
            code: "INVALID_ENUM",
            message: `Unsupported vehicle type: '${t}'.`,
          });
        }
      }
    }
  }

  if (body.fuelTypes !== undefined) {
    if (!Array.isArray(body.fuelTypes)) {
      fieldErrors.push({
        field: "fuelTypes",
        code: "INVALID_FORMAT",
        message: "Fuel types must be an array of strings.",
      });
    } else {
      for (const f of body.fuelTypes) {
        if (!ALLOWED_FUEL_TYPES.has(f)) {
          fieldErrors.push({
            field: "fuelTypes",
            code: "INVALID_ENUM",
            message: `Unsupported fuel type: '${f}'.`,
          });
        }
      }
    }
  }

  if (body.transmissions !== undefined) {
    if (!Array.isArray(body.transmissions)) {
      fieldErrors.push({
        field: "transmissions",
        code: "INVALID_FORMAT",
        message: "Transmissions must be an array of strings.",
      });
    } else {
      for (const tr of body.transmissions) {
        if (!ALLOWED_TRANSMISSIONS.has(tr)) {
          fieldErrors.push({
            field: "transmissions",
            code: "INVALID_ENUM",
            message: `Unsupported transmission: '${tr}'.`,
          });
        }
      }
    }
  }

  if (body.minimumSeats !== undefined) {
    if (
      typeof body.minimumSeats !== "number" ||
      !Number.isInteger(body.minimumSeats) ||
      body.minimumSeats < 1 ||
      body.minimumSeats > 20
    ) {
      fieldErrors.push({
        field: "minimumSeats",
        code: "INVALID_SEATS",
        message: "Minimum seats must be an integer between 1 and 20.",
      });
    }
  }

  if (body.drivingEnvironment !== undefined) {
    if (!ALLOWED_ENVIRONMENTS.has(body.drivingEnvironment)) {
      fieldErrors.push({
        field: "drivingEnvironment",
        code: "INVALID_ENUM",
        message: "Driving environment must be 'city', 'highway', or 'mixed'.",
      });
    }
  }

  if (body.annualDistanceKm !== undefined) {
    if (
      typeof body.annualDistanceKm !== "number" ||
      !Number.isFinite(body.annualDistanceKm) ||
      body.annualDistanceKm < 0
    ) {
      fieldErrors.push({
        field: "annualDistanceKm",
        code: "INVALID_DISTANCE",
        message: "Annual distance must be a non-negative number.",
      });
    }
  }

  if (body.priorities !== undefined) {
    if (typeof body.priorities !== "object" || body.priorities === null || Array.isArray(body.priorities)) {
      fieldErrors.push({
        field: "priorities",
        code: "INVALID_FORMAT",
        message: "Priorities must be an object.",
      });
    } else {
      for (const [pKey, pVal] of Object.entries(body.priorities)) {
        if (!ALLOWED_PRIORITY_KEYS.has(pKey)) {
          fieldErrors.push({
            field: `priorities.${pKey}`,
            code: "UNRECOGNIZED_FIELD",
            message: `Priority '${pKey}' is not supported.`,
          });
        } else if (
          typeof pVal !== "number" ||
          !Number.isFinite(pVal) ||
          pVal < 1 ||
          pVal > 5
        ) {
          fieldErrors.push({
            field: `priorities.${pKey}`,
            code: "INVALID_RANGE",
            message: `Priority '${pKey}' must be a number between 1 and 5.`,
          });
        }
      }
    }
  }

  return fieldErrors;
}

export function createUsersRouter({ models, authenticate }) {
  const router = Router();
  const getUser = () => {
    const model = models.User;
    if (!model) {
      throw new HttpError(503, "SERVICE_NOT_READY", "Database models are not ready.");
    }
    return model;
  };

  // Read own profile
  router.get("/api/v1/users/me", authenticate(), async (request, response, next) => {
    const user = await getUser().findById(request.user.id);
    if (!user) {
      return next(new HttpError(404, "USER_NOT_FOUND", "Account does not exist."));
    }

    return response.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      profile: user.profile || {},
    });
  });

  // Update own profile
  router.patch("/api/v1/users/me", authenticate(), async (request, response, next) => {
    const body = request.body;
    if (!body || typeof body !== "object") {
      return next(new HttpError(400, "VALIDATION_ERROR", "Request body is required."));
    }

    const fieldErrors = [];
    for (const key of Object.keys(body)) {
      if (FORBIDDEN_MUTATION_KEYS.has(key)) {
        fieldErrors.push({
          field: key,
          code: "FORBIDDEN_FIELD",
          message: `Field '${key}' cannot be modified.`,
        });
      } else if (!ALLOWED_PROFILE_KEYS.has(key)) {
        fieldErrors.push({
          field: key,
          code: "UNRECOGNIZED_FIELD",
          message: `Field '${key}' is not allowed in profile update.`,
        });
      }
    }

    if (body.displayName !== undefined) {
      if (
        typeof body.displayName !== "string" ||
        body.displayName.trim().length === 0 ||
        body.displayName.trim().length > 50
      ) {
        fieldErrors.push({
          field: "displayName",
          code: "INVALID_LENGTH",
          message: "Display name must be between 1 and 50 characters.",
        });
      }
    }

    if (body.city !== undefined) {
      if (
        typeof body.city !== "string" ||
        body.city.trim().length === 0 ||
        body.city.trim().length > 50
      ) {
        fieldErrors.push({
          field: "city",
          code: "INVALID_LENGTH",
          message: "City must be between 1 and 50 characters.",
        });
      }
    }

    if (fieldErrors.length > 0) {
      return next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "The profile update contains invalid fields.",
          fieldErrors,
        ),
      );
    }

    const user = await getUser().findById(request.user.id);
    if (!user) {
      return next(new HttpError(404, "USER_NOT_FOUND", "Account does not exist."));
    }

    const profile = user.profile ? { ...user.profile } : {};
    if (body.displayName !== undefined) {
      profile.displayName = body.displayName.trim();
    }
    if (body.city !== undefined) {
      profile.city = body.city.trim();
    }

    user.profile = profile;
    await user.save();

    return response.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      profile: user.profile,
    });
  });

  // Read own preferences
  router.get("/api/v1/users/me/preferences", authenticate(), async (request, response, next) => {
    const user = await getUser().findById(request.user.id);
    if (!user) {
      return next(new HttpError(404, "USER_NOT_FOUND", "Account does not exist."));
    }

    return response.json({
      preferences: user.preferences || {},
    });
  });

  // Replace/update own preferences
  router.put("/api/v1/users/me/preferences", authenticate(), async (request, response, next) => {
    const body = request.body;
    if (!body || typeof body !== "object") {
      return next(new HttpError(400, "VALIDATION_ERROR", "Request body is required."));
    }

    for (const key of Object.keys(body)) {
      if (FORBIDDEN_MUTATION_KEYS.has(key)) {
        return next(
          new HttpError(400, "VALIDATION_ERROR", `Protected field '${key}' cannot be submitted.`),
        );
      }
    }

    const fieldErrors = validatePreferences(body);
    if (fieldErrors.length > 0) {
      return next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "The preferences request contains invalid fields.",
          fieldErrors,
        ),
      );
    }

    const user = await getUser().findById(request.user.id);
    if (!user) {
      return next(new HttpError(404, "USER_NOT_FOUND", "Account does not exist."));
    }

    user.preferences = body;
    user.markModified("preferences");
    await user.save();

    return response.json({
      preferences: user.preferences,
    });
  });

  return router;
}
