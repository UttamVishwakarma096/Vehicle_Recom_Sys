export class ApiError extends Error {
  constructor(status, code, message, fieldErrors = [], retryAfter = null) {
    super(message || "An API error occurred.");
    this.name = "ApiError";
    this.status = status;
    this.code = code || "API_ERROR";
    this.fieldErrors = fieldErrors;
    this.retryAfter = retryAfter;
  }
}

function getBaseUrl(envKey, fallbackUrl = "") {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    if (import.meta.env[envKey]) {
      return String(import.meta.env[envKey]).replace(/\/+$/, "");
    }
    if (import.meta.env.PROD && fallbackUrl) {
      return fallbackUrl.replace(/\/+$/, "");
    }
  }
  if (typeof process !== "undefined" && process.env) {
    if (process.env[envKey]) {
      return String(process.env[envKey]).replace(/\/+$/, "");
    }
    if (process.env.NODE_ENV === "production" && fallbackUrl) {
      return fallbackUrl.replace(/\/+$/, "");
    }
  }
  return "";
}

export function resolveServiceUrl(path) {
  const identityBase = getBaseUrl(
    "VITE_IDENTITY_URL",
    "https://vehicle-recom-sys-identity-user.onrender.com"
  );
  const catalogBase = getBaseUrl(
    "VITE_CATALOG_URL",
    "https://vehicle-recom-sys-vehicle-catelog.onrender.com"
  );
  const recommendationBase = getBaseUrl(
    "VITE_RECOMMENDATION_URL",
    "https://vehicle-recom-sys-recommendation.onrender.com"
  );

  if (
    path.startsWith("/api/v1/auth") ||
    path.startsWith("/api/v1/users") ||
    path.startsWith("/api/v1/admin/users")
  ) {
    return `${identityBase}${path}`;
  }
  if (path.startsWith("/api/v1/vehicles") || path.startsWith("/api/v1/admin/vehicles")) {
    return `${catalogBase}${path}`;
  }
  if (
    path.startsWith("/api/v1/recommendations") ||
    path.startsWith("/api/v1/compare") ||
    path.startsWith("/api/v1/favorites") ||
    path.startsWith("/api/v1/longevity") ||
    path.startsWith("/api/v1/ai")
  ) {
    return `${recommendationBase}${path}`;
  }
  return path;
}

class ApiClient {
  constructor() {
    this.csrfToken = null;
    this.token = null;
  }

  setCsrfToken(token) {
    this.csrfToken = token;
  }

  getCsrfToken() {
    return this.csrfToken;
  }

  setToken(token) {
    this.token = token;
    if (typeof localStorage !== "undefined") {
      if (token) {
        localStorage.setItem("vehicle_auth_token", token);
      } else {
        localStorage.removeItem("vehicle_auth_token");
      }
    }
  }

  getToken() {
    if (this.token) return this.token;
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("vehicle_auth_token");
    }
    return null;
  }

  async request(path, options = {}) {
    const {
      method = "GET",
      body,
      headers = {},
      ...customOptions
    } = options;

    const requestHeaders = {
      Accept: "application/json",
      ...headers,
    };

    const authToken = this.getToken();
    if (authToken && !requestHeaders["Authorization"]) {
      requestHeaders["Authorization"] = `Bearer ${authToken}`;
    }

    if (body !== undefined && !(body instanceof FormData)) {
      requestHeaders["Content-Type"] = "application/json";
    }

    const stateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
    if (stateChanging && this.csrfToken) {
      requestHeaders["X-CSRF-Token"] = this.csrfToken;
    }

    const response = await fetch(resolveServiceUrl(path), {
      method,
      headers: requestHeaders,
      credentials: "include", // send cookies
      body: body !== undefined && !(body instanceof FormData) ? JSON.stringify(body) : body,
      ...customOptions,
    });

    // Check for CSRF token update in response header
    const newCsrf = response.headers.get("x-csrf-token");
    if (newCsrf) {
      this.csrfToken = newCsrf;
    }

    if (response.status === 204) {
      return null;
    }

    let responseData = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    }

    if (!response.ok) {
      if (
        response.status === 401 &&
        !path.startsWith("/api/v1/auth/") &&
        !options._isRetry
      ) {
        try {
          const refreshRes = await fetch(resolveServiceUrl("/api/v1/auth/refresh"), {
            method: "POST",
            headers: { Accept: "application/json" },
            credentials: "include",
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData?.csrfToken) {
              this.csrfToken = refreshData.csrfToken;
            }
            return await this.request(path, { ...options, _isRetry: true });
          }
        } catch {
          // Refresh failed, proceed to throw original ApiError
        }
      }

      const err = responseData?.error;
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : null;
      throw new ApiError(
        response.status,
        err?.code || "HTTP_ERROR",
        err?.message || `Request failed with status ${response.status}`,
        err?.fieldErrors || [],
        retryAfter,
      );
    }

    return responseData;
  }

  get(path, options) {
    return this.request(path, { ...options, method: "GET" });
  }

  post(path, body, options) {
    return this.request(path, { ...options, method: "POST", body });
  }

  put(path, body, options) {
    return this.request(path, { ...options, method: "PUT", body });
  }

  patch(path, body, options) {
    return this.request(path, { ...options, method: "PATCH", body });
  }

  delete(path, options) {
    return this.request(path, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
