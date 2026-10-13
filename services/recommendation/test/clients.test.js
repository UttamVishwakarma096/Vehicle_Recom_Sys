import assert from "node:assert/strict";
import { test } from "node:test";
import { CatalogClient } from "../src/clients/catalogClient.js";
import { IdentityClient } from "../src/clients/identityClient.js";
import { HttpError } from "../src/foundation.js";

test("CatalogClient sends internal service key and correlation ID", async () => {
  let capturedUrl;
  let capturedHeaders;
  let capturedBody;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    capturedBody = JSON.parse(options.body);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        items: [{ id: "veh-1", make: "Tata", model: "Nexon" }],
        pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      }),
    };
  };

  const client = new CatalogClient({
    baseUrl: "http://127.0.0.1:4002",
    serviceKey: "secret-key-123",
    fetchImpl: mockFetch,
  });

  const result = await client.searchCandidates(
    { vehicleTypes: ["suv"] },
    { page: 1, limit: 10 },
    { correlationId: "corr-xyz" },
  );

  assert.equal(capturedUrl, "http://127.0.0.1:4002/internal/v1/vehicles/search");
  assert.equal(capturedHeaders["X-Internal-Service-Key"], "secret-key-123");
  assert.equal(capturedHeaders["X-Correlation-ID"], "corr-xyz");
  assert.deepEqual(capturedBody.vehicleTypes, ["suv"]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].model, "Nexon");
});

test("CatalogClient lookupVehicles sends vehicleIds and returns response", async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      vehicles: [{ id: "v1" }],
      unavailableIds: ["v2"],
    }),
  });

  const client = new CatalogClient({
    baseUrl: "http://127.0.0.1:4002",
    serviceKey: "secret-key-123",
    fetchImpl: mockFetch,
  });

  const result = await client.lookupVehicles(["v1", "v2"], { correlationId: "lookup-1" });
  assert.equal(result.vehicles.length, 1);
  assert.deepEqual(result.unavailableIds, ["v2"]);
});

// COMP-04: Catalog Service intentionally unavailable
test("COMP-04: CatalogClient handles unavailable downstream service with 503", async () => {
  const failingFetch = async () => {
    const error = new TypeError("fetch failed: connection refused");
    throw error;
  };

  const client = new CatalogClient({
    baseUrl: "http://127.0.0.1:9999", // Unreachable port
    fetchImpl: failingFetch,
  });

  await assert.rejects(
    async () => client.searchCandidates({}),
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 503);
      assert.equal(err.code, "DOWNSTREAM_UNAVAILABLE");
      return true;
    },
  );
});

test("CatalogClient handles timeout with 504 DOWNSTREAM_TIMEOUT", async () => {
  const timeoutFetch = async () => {
    const error = new Error("The operation was aborted due to timeout");
    error.name = "TimeoutError";
    throw error;
  };

  const client = new CatalogClient({
    baseUrl: "http://127.0.0.1:4002",
    fetchImpl: timeoutFetch,
  });

  await assert.rejects(
    async () => client.lookupVehicles(["v1"]),
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 504);
      assert.equal(err.code, "DOWNSTREAM_TIMEOUT");
      return true;
    },
  );
});

test("IdentityClient retrieves user preferences and propagates correlation ID", async () => {
  let capturedHeaders;

  const mockFetch = async (_url, options) => {
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        userId: "u-1",
        preferences: { budget: { min: 500000, max: 1000000 } },
      }),
    };
  };

  const client = new IdentityClient({
    baseUrl: "http://127.0.0.1:4001",
    serviceKey: "ident-secret",
    fetchImpl: mockFetch,
  });

  const prefs = await client.getUserPreferences("u-1", { correlationId: "corr-ident" });
  assert.equal(capturedHeaders["X-Internal-Service-Key"], "ident-secret");
  assert.equal(capturedHeaders["X-Correlation-ID"], "corr-ident");
  assert.equal(prefs.budget.min, 500000);
});

test("IdentityClient handles non-existent user with 404", async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 404,
    json: async () => ({ error: { code: "NOT_FOUND", message: "User not found." } }),
  });

  const client = new IdentityClient({
    baseUrl: "http://127.0.0.1:4001",
    fetchImpl: mockFetch,
  });

  await assert.rejects(
    async () => client.getUserPreferences("unknown-user"),
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 404);
      assert.equal(err.code, "USER_NOT_FOUND");
      return true;
    },
  );
});
