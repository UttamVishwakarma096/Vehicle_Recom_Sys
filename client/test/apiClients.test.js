import assert from "node:assert/strict";
import { test } from "node:test";
import { apiClient, ApiError } from "../src/services/apiClient.js";
import { authClient } from "../src/services/authClient.js";
import { catalogClient } from "../src/services/catalogClient.js";
import { recommendationClient } from "../src/services/recommendationClient.js";

test("apiClient manages CSRF token and serializes JSON requests", async () => {
  apiClient.setCsrfToken("csrf-token-xyz");
  assert.equal(apiClient.getCsrfToken(), "csrf-token-xyz");

  let interceptedUrl;
  let interceptedOptions;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    interceptedUrl = url;
    interceptedOptions = options;
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": "csrf-token-updated",
      },
    });
  };

  try {
    const res = await apiClient.post("/api/v1/test", { sample: "data" });
    assert.deepEqual(res, { success: true });
    assert.equal(interceptedUrl, "/api/v1/test");
    assert.equal(interceptedOptions.method, "POST");
    assert.equal(interceptedOptions.headers["X-CSRF-Token"], "csrf-token-xyz");
    assert.equal(interceptedOptions.headers["Content-Type"], "application/json");
    assert.equal(interceptedOptions.body, JSON.stringify({ sample: "data" }));
    assert.equal(apiClient.getCsrfToken(), "csrf-token-updated");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiClient normalizes HTTP errors into ApiError instances", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_FAILED",
          message: "Input validation error",
          fieldErrors: [{ field: "email", message: "Invalid email" }],
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  try {
    await assert.rejects(
      async () => {
        await apiClient.get("/api/v1/invalid");
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.code, "VALIDATION_FAILED");
        assert.equal(err.message, "Input validation error");
        assert.equal(err.fieldErrors.length, 1);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiClient parses Retry-After header on 429 rate limit errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many login attempts. Please wait 15s before trying again.",
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "15",
        },
      },
    );
  };

  try {
    await assert.rejects(
      async () => {
        await apiClient.post("/api/v1/auth/login", { email: "test@example.com", password: "pwd" });
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 429);
        assert.equal(err.code, "RATE_LIMIT_EXCEEDED");
        assert.equal(err.retryAfter, 15);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("catalogClient.listVehicles serializes query parameters accurately", async () => {
  let interceptedUrl;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    interceptedUrl = url;
    return new Response(JSON.stringify({ items: [], pagination: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await catalogClient.listVehicles({
      q: "honda",
      bodyType: "sedan",
      minPrice: 500000,
      maxPrice: 1000000,
      page: 2,
    });

    const parsed = new URL(interceptedUrl, "http://localhost");
    assert.equal(parsed.pathname, "/api/v1/vehicles");
    assert.equal(parsed.searchParams.get("q"), "honda");
    assert.equal(parsed.searchParams.get("bodyType"), "sedan");
    assert.equal(parsed.searchParams.get("minPrice"), "500000");
    assert.equal(parsed.searchParams.get("maxPrice"), "1000000");
    assert.equal(parsed.searchParams.get("page"), "2");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("recommendationClient formats payload and catches longevity feature gates", async () => {
  let interceptedBody;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    interceptedBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ ruleVersion: "rules-v1", items: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await recommendationClient.getRecommendations({
      useSavedPreferences: true,
      page: 1,
      limit: 10,
    });
    assert.equal(interceptedBody.useSavedPreferences, true);
    assert.equal(interceptedBody.page, 1);
    assert.equal(interceptedBody.limit, 10);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Longevity gate handling
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: "FEATURE_NOT_ENABLED",
          message: "Longevity prediction is disabled. Evidence gates have not passed.",
        },
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  try {
    const res = await recommendationClient.getLongevityEstimate({ vehicleId: "123" });
    assert.equal(res.enabled, false);
    assert.equal(res.code, "FEATURE_NOT_ENABLED");
    assert.ok(res.message.includes("Longevity prediction is disabled"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("authClient performs login, register, and logout with CSRF update", async () => {
  let interceptedMethod;
  let interceptedBody;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options) => {
    interceptedMethod = options.method;
    interceptedBody = options.body ? JSON.parse(options.body) : null;
    return new Response(
      JSON.stringify({
        user: { id: "u-123", email: "user@example.com", role: "user" },
        csrfToken: "new-csrf-123",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  try {
    const data = await authClient.login({ email: "user@example.com", password: "password12345" });
    assert.equal(interceptedMethod, "POST");
    assert.equal(interceptedBody.email, "user@example.com");
    assert.equal(data.user.id, "u-123");
    assert.equal(apiClient.getCsrfToken(), "new-csrf-123");

    await authClient.logout();
    assert.equal(apiClient.getCsrfToken(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("recommendationClient.getAiComparisonConclusion serializes vehicleIds and optional userPreferences", async () => {
  let interceptedUrl;
  let interceptedBody;
  let interceptedHeaders;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options) => {
    interceptedUrl = url;
    interceptedHeaders = options.headers;
    interceptedBody = JSON.parse(options.body);
    return new Response(
      JSON.stringify({
        success: true,
        conclusion: { summary: "Test summary", verdicts: [], categoryWinners: [], finalTakeaway: "Test takeaway" },
        userPreferences: interceptedBody.userPreferences,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  try {
    const res = await recommendationClient.getAiComparisonConclusion(["id-1", "id-2"], {
      userPreferences: "Prefer high mileage and low maintenance",
      apiKey: "custom-api-key",
    });

    assert.equal(interceptedUrl, "/api/v1/compare/conclusion");
    assert.deepEqual(interceptedBody.vehicleIds, ["id-1", "id-2"]);
    assert.equal(interceptedBody.userPreferences, "Prefer high mileage and low maintenance");
    assert.equal(interceptedHeaders["x-gemini-api-key"], "custom-api-key");
    assert.equal(res.success, true);
    assert.equal(res.userPreferences, "Prefer high mileage and low maintenance");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
