import { Router } from "express";
import { HttpError } from "../foundation.js";
import { validateRecommendationRequest } from "../recommendations/validation.js";
import { rankCandidates } from "../recommendations/ranking.js";

export function createRecommendationRoutes({
  catalogClient,
  identityClient,
  authenticate,
} = {}) {
  const router = Router();

  // POST /api/v1/recommendations
  // Protected: User must be authenticated to calculate recommendations
  router.post("/", authenticate(), async (request, response, next) => {
    try {
      const body = request.body;
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new HttpError(400, "INVALID_FORMAT", "Request body must be a JSON object.");
      }

      const useSavedPreferences = Boolean(body.useSavedPreferences);

      let preferences;

      if (useSavedPreferences) {
        if (body.preferences !== undefined && Object.keys(body.preferences).length > 0) {
          throw new HttpError(
            400,
            "INVALID_INPUT",
            "Cannot provide both 'preferences' and 'useSavedPreferences: true'. Exactly one must be specified.",
          );
        }

        if (!request.user) {
          throw new HttpError(
            401,
            "UNAUTHORIZED",
            "Authentication is required when 'useSavedPreferences' is true.",
          );
        }

        if (!identityClient) {
          throw new HttpError(
            503,
            "DOWNSTREAM_UNAVAILABLE",
            "Identity client is not configured.",
          );
        }

        const savedPrefs = await identityClient.getUserPreferences(request.user.id, {
          correlationId: request.correlationId,
        });

        if (!savedPrefs || typeof savedPrefs !== "object" || Object.keys(savedPrefs).length === 0) {
          throw new HttpError(
            400,
            "SAVED_PREFERENCES_MISSING",
            "User has no saved preferences configured.",
          );
        }

        const validation = validateRecommendationRequest({ preferences: savedPrefs });
        if (!validation.isValid) {
          throw new HttpError(
            400,
            "INVALID_SAVED_PREFERENCES",
            "Saved preferences do not conform to recommendation schema.",
            validation.fieldErrors,
          );
        }
        preferences = validation.preferences;
      } else {
        if (body.preferences === undefined || body.preferences === null) {
          throw new HttpError(
            400,
            "INVALID_INPUT",
            "Either 'preferences' object or 'useSavedPreferences: true' must be provided.",
          );
        }

        const validation = validateRecommendationRequest(body);
        if (!validation.isValid) {
          throw new HttpError(
            400,
            "VALIDATION_FAILED",
            "Invalid recommendation preferences.",
            validation.fieldErrors,
          );
        }
        preferences = validation.preferences;
      }

      // Pagination
      let page = 1;
      if (body.page !== undefined) {
        if (!Number.isInteger(body.page) || body.page < 1) {
          throw new HttpError(400, "INVALID_PAGINATION", "Page must be a positive integer >= 1.");
        }
        page = body.page;
      }

      let limit = 20;
      if (body.limit !== undefined) {
        if (!Number.isInteger(body.limit) || body.limit < 1 || body.limit > 100) {
          throw new HttpError(400, "INVALID_PAGINATION", "Limit must be a positive integer between 1 and 100.");
        }
        limit = body.limit;
      }

      if (!catalogClient) {
        throw new HttpError(
          503,
          "DOWNSTREAM_UNAVAILABLE",
          "Catalog client is not configured.",
        );
      }

      // Build catalog search filters
      const searchFilters = {};
      if (preferences.budget) {
        searchFilters.budget = preferences.budget;
      }
      if (preferences.vehicleTypes) {
        searchFilters.vehicleTypes = preferences.vehicleTypes;
      }
      if (preferences.fuelTypes) {
        searchFilters.fuelTypes = preferences.fuelTypes;
      }
      if (preferences.transmissions) {
        searchFilters.transmissions = preferences.transmissions;
      }
      if (preferences.minimumSeats) {
        searchFilters.minimumSeats = preferences.minimumSeats;
      }

      // Retrieve candidates from Catalog Service
      const catalogResult = await catalogClient.searchCandidates(
        searchFilters,
        { page: 1, limit: 100 },
        { correlationId: request.correlationId },
      );

      const candidates = catalogResult?.items || [];

      // Rank candidates using pure domain logic
      const ranked = rankCandidates(candidates, preferences);

      const totalItems = ranked.results.length;
      const totalPages = Math.ceil(totalItems / limit) || (totalItems === 0 ? 0 : 1);
      const startIndex = (page - 1) * limit;
      const paginatedResults = ranked.results.slice(startIndex, startIndex + limit);

      const items = paginatedResults.map((item) => ({
        vehicle: item.vehicle,
        rank: item.rank,
        matchScore: item.matchScore,
        scoreStatus: item.scoreStatus,
        evidenceCoverage: item.evidenceCoverage,
        componentScores: item.componentScores,
        reasons: item.reasons,
        tradeoffs: item.tradeoffs,
        constraints: [],
        missingData: item.missingData,
      }));

      return response.status(200).json({
        ruleVersion: ranked.ruleVersion,
        items,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
        scoreDisclaimer: ranked.disclaimer,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
