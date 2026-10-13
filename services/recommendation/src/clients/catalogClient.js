import { HttpError } from "../foundation.js";

export class CatalogClient {
  constructor({
    baseUrl,
    serviceKey = process.env.INTERNAL_SERVICE_SECRET || "internal-service-secret-dev",
    timeoutMs = 3000,
    fetchImpl = fetch,
  } = {}) {
    if (!baseUrl) {
      throw new Error("baseUrl is required for CatalogClient.");
    }
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.serviceKey = serviceKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async searchCandidates(filters = {}, pagination = {}, { correlationId } = {}) {
    const url = `${this.baseUrl}/internal/v1/vehicles/search`;
    const headers = {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": this.serviceKey,
    };
    if (correlationId) {
      headers["X-Correlation-ID"] = correlationId;
    }

    const body = JSON.stringify({ ...filters, ...pagination });

    try {
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        await this._handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      this._handleNetworkOrTimeoutError(error);
    }
  }

  async lookupVehicles(vehicleIds = [], { correlationId } = {}) {
    const url = `${this.baseUrl}/internal/v1/vehicles/lookup`;
    const headers = {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": this.serviceKey,
    };
    if (correlationId) {
      headers["X-Correlation-ID"] = correlationId;
    }

    const body = JSON.stringify({ vehicleIds });

    try {
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        await this._handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      this._handleNetworkOrTimeoutError(error);
    }
  }

  async _handleErrorResponse(response) {
    let errorJson = null;
    try {
      errorJson = await response.json();
    } catch {
      // non-JSON response
    }

    const message = errorJson?.error?.message;

    if (response.status === 401 || response.status === 403) {
      throw new HttpError(
        500,
        "DOWNSTREAM_AUTH_FAILED",
        "Catalog service authentication failed.",
      );
    }

    if (response.status === 400) {
      throw new HttpError(
        400,
        "DOWNSTREAM_BAD_REQUEST",
        message || "Invalid catalog service request.",
        errorJson?.error?.fieldErrors,
      );
    }

    if (response.status >= 500) {
      throw new HttpError(
        503,
        "DOWNSTREAM_UNAVAILABLE",
        "Catalog service reported an error.",
      );
    }

    throw new HttpError(
      response.status,
      errorJson?.error?.code || "DOWNSTREAM_ERROR",
      message || "Catalog service returned an error.",
    );
  }

  _handleNetworkOrTimeoutError(error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new HttpError(
        504,
        "DOWNSTREAM_TIMEOUT",
        "Catalog service request timed out.",
      );
    }

    throw new HttpError(
      503,
      "DOWNSTREAM_UNAVAILABLE",
      "Catalog service is unavailable.",
    );
  }
}
