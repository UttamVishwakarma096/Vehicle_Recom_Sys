import { apiClient } from "./apiClient.js";

export const aiClient = {
  /**
   * Identify vehicle from image base64 data using Gemini AI
   * @param {Object} options
   * @param {string} options.image Base64 encoded image string or data URL
   * @param {string} [options.mimeType] Image MIME type
   * @param {string} [options.apiKey] Optional user-provided free Gemini API key
   * @returns {Promise<Object>}
   */
  async identifyVehicle({ image, mimeType = "image/jpeg" } = {}) {
    return await apiClient.post(
      "/api/v1/ai/identify-vehicle",
      { image, mimeType },
    );
  },
};
