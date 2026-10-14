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

class ApiClient {
  constructor() {
    this.csrfToken = null;
  }

  setCsrfToken(token) {
    this.csrfToken = token;
  }

  getCsrfToken() {
    return this.csrfToken;
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

    if (body !== undefined && !(body instanceof FormData)) {
      requestHeaders["Content-Type"] = "application/json";
    }

    const stateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
    if (stateChanging && this.csrfToken) {
      requestHeaders["X-CSRF-Token"] = this.csrfToken;
    }

    const response = await fetch(path, {
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
          const refreshRes = await fetch("/api/v1/auth/refresh", {
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
