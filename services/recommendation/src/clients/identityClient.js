import { HttpError } from "../foundation.js";

export class IdentityClient {
  constructor({
    baseUrl,
    serviceKey = process.env.INTERNAL_SERVICE_SECRET || "internal-service-secret-dev",
    timeoutMs = 3000,
    fetchImpl = fetch,
  } = {}) {
    if (!baseUrl) {
      throw new Error("baseUrl is required for IdentityClient.");
    }
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.serviceKey = serviceKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async getUserPreferences(userId, { correlationId } = {}) {
    if (!userId || typeof userId !== "string") {
      throw new HttpError(400, "INVALID_IDENTIFIER", "userId must be a non-empty string.");
    }

    const url = `${this.baseUrl}/internal/v1/users/${encodeURIComponent(userId)}/preferences`;
    const headers = {
      "X-Internal-Service-Key": this.serviceKey,
    };
    if (correlationId) {
      headers["X-Correlation-ID"] = correlationId;
    }

    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        let errorJson = null;
        try {
          errorJson = await response.json();
        } catch {
          // ignore
        }

        if (response.status === 404) {
          throw new HttpError(404, "USER_NOT_FOUND", "User was not found.");
        }

        if (response.status === 401 || response.status === 403) {
          throw new HttpError(
            500,
            "DOWNSTREAM_AUTH_FAILED",
            "Identity service authentication failed.",
          );
        }

        if (response.status >= 500) {
          throw new HttpError(
            503,
            "DOWNSTREAM_UNAVAILABLE",
            "Identity service reported an error.",
          );
        }

        throw new HttpError(
          response.status,
          errorJson?.error?.code || "DOWNSTREAM_ERROR",
          errorJson?.error?.message || "Identity service returned an error.",
        );
      }

      const json = await response.json();
      return json.preferences;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      if (error.name === "TimeoutError" || error.name === "AbortError") {
        throw new HttpError(
          504,
          "DOWNSTREAM_TIMEOUT",
          "Identity service request timed out.",
        );
      }

      throw new HttpError(
        503,
        "DOWNSTREAM_UNAVAILABLE",
        "Identity service is unavailable.",
      );
    }
  }
}
