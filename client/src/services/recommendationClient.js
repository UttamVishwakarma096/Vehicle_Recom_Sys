import { apiClient, ApiError } from "./apiClient.js";

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export const recommendationClient = {
  async getRecommendations({ preferences, useSavedPreferences = false, page = 1, limit = 20 } = {}) {
    const payload = { page, limit };
    if (useSavedPreferences) {
      payload.useSavedPreferences = true;
    } else if (preferences) {
      payload.preferences = preferences;
    }
    return await apiClient.post("/api/v1/recommendations", payload);
  },

  async compareVehicles(vehicleIds = []) {
    return await apiClient.post("/api/v1/compare", { vehicleIds });
  },

  async getAiComparisonConclusion(vehicleIds = [], { apiKey } = {}) {
    const headers = {};
    if (apiKey) {
      headers["x-gemini-api-key"] = apiKey;
    }
    return await apiClient.post(
      "/api/v1/compare/conclusion",
      { vehicleIds, apiKey },
      { headers },
    );
  },

  async listFavorites(params = {}) {
    const qs = buildQueryString(params);
    return await apiClient.get(`/api/v1/favorites${qs}`);
  },

  async addFavorite(vehicleId) {
    return await apiClient.put(`/api/v1/favorites/${encodeURIComponent(vehicleId)}`);
  },

  async removeFavorite(vehicleId) {
    return await apiClient.delete(`/api/v1/favorites/${encodeURIComponent(vehicleId)}`);
  },

  async getLongevityEstimate(payload = {}) {
    try {
      return await apiClient.post("/api/v1/longevity/estimate", payload);
    } catch (error) {
      if (error instanceof ApiError && error.code === "FEATURE_NOT_ENABLED") {
        return {
          enabled: false,
          code: "FEATURE_NOT_ENABLED",
          message: error.message || "Longevity prediction is disabled. Evidence gates have not passed.",
        };
      }
      throw error;
    }
  },
};
