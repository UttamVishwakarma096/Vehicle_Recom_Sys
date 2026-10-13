process.env.NODE_ENV = "test";

import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import crypto from "node:crypto";
import { createApp, SERVICE_NAME } from "../src/app.js";
import { createLogger } from "../src/foundation.js";
import { TokenVerifier } from "../src/auth/jwt.js";

let server;
let baseUrl;
let keyPair;
let tokenVerifier;

const TEST_USER = {
  id: "665000000000000000000001",
  email: "driver@example.com",
  role: "user",
};

const mockCatalogClient = {
  async searchVehicles({ query }) {
    if (query?.toLowerCase().includes("nexon") || query?.toLowerCase().includes("tata")) {
      return {
        items: [
          {
            id: "666000000000000000000001",
            make: "Tata",
            model: "Nexon",
            variant: "XZ+",
            modelYear: 2023,
            bodyType: "suv",
            fuelType: "petrol",
            prices: [{ type: "ex_showroom", amount: "800000", currency: "INR" }],
          },
        ],
        pagination: { totalItems: 1 },
      };
    }
    return { items: [], pagination: { totalItems: 0 } };
  },
};

function createJwt(user, { expiresInSeconds = 900 } = {}) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iss: "urn:vehicle:identity-user",
    aud: "urn:vehicle:services",
    iat: now,
    exp: now + expiresInSeconds,
    jti: crypto.randomUUID(),
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.sign("sha256", Buffer.from(data), keyPair.privateKey);
  const sigB64 = sig.toString("base64url");

  return `${data}.${sigB64}`;
}

before(async () => {
  keyPair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  tokenVerifier = new TokenVerifier({ publicKey: keyPair.publicKey });

  const app = createApp({
    logger: createLogger(SERVICE_NAME, () => {}),
    isReady: () => true,
    models: {},
    tokenVerifier,
    catalogClient: mockCatalogClient,
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("AI-01: Anonymous request to /api/v1/ai/identify-vehicle succeeds without requiring auth tokens", async () => {
  const response = await fetch(`${baseUrl}/api/v1/ai/identify-vehicle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: "data:image/jpeg;base64,sampleanon",
      mimeType: "image/jpeg",
    }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.ok(data.identification);
  assert.equal(response.headers.get("x-ratelimit-limit"), "3");
});

test("AI-02: Missing or invalid image parameter returns 400 INVALID_INPUT", async () => {
  const token = createJwt(TEST_USER);
  const response = await fetch(`${baseUrl}/api/v1/ai/identify-vehicle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error.code, "INVALID_INPUT");
});

test("AI-03: Authenticated user can submit image and receive identification with catalog matches", async () => {
  const token = createJwt(TEST_USER);
  const response = await fetch(`${baseUrl}/api/v1/ai/identify-vehicle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      image: "data:image/jpeg;base64,samplebase64data",
      mimeType: "image/jpeg",
    }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.ok(data.identification);
  assert.equal(data.identification.make, "Tata");
  assert.equal(data.identification.model, "Nexon");
  assert.equal(data.identification.bodyType, "suv");
  assert.ok(Array.isArray(data.catalogMatches));
  assert.equal(data.catalogMatches.length, 1);
  assert.equal(data.catalogMatches[0].model, "Nexon");
});

test("AI-04: Token bucket rate limiter returns 429 RATE_LIMIT_EXCEEDED when bucket is empty", async () => {
  // Use a unique client header so this test has its own bucket
  const clientIp = "192.168.10.99";
  const headers = {
    "Content-Type": "application/json",
    "x-forwarded-for": clientIp,
  };
  const body = JSON.stringify({ image: "data:image/jpeg;base64,sample" });

  // Consume 3 tokens (capacity = 3)
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${baseUrl}/api/v1/ai/identify-vehicle`, {
      method: "POST",
      headers,
      body,
    });
    assert.equal(res.status, 200, `Request ${i + 1} should succeed`);
  }

  // 4th request must be rejected with 429
  const limitedRes = await fetch(`${baseUrl}/api/v1/ai/identify-vehicle`, {
    method: "POST",
    headers,
    body,
  });

  assert.equal(limitedRes.status, 429);
  assert.ok(limitedRes.headers.get("retry-after"));
  const data = await limitedRes.json();
  assert.equal(data.error.code, "RATE_LIMIT_EXCEEDED");
  assert.match(data.error.message, /rate limit reached/i);
});

test("AI-05: TokenBucketRateLimiter refills tokens over elapsed time", async () => {
  const { TokenBucketRateLimiter } = await import("../src/rateLimit.js");
  const limiter = new TokenBucketRateLimiter({
    capacity: 2,
    refillIntervalMs: 100, // 100ms for fast test execution
    cleanupIntervalMs: 0,
  });

  // Consume all 2 tokens
  const r1 = limiter.consume("test-client", 1);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 1);

  const r2 = limiter.consume("test-client", 1);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 0);

  // 3rd attempt is rejected
  const r3 = limiter.consume("test-client", 1);
  assert.equal(r3.allowed, false);
  assert.ok(r3.retryAfterSeconds >= 1);

  // Wait for 1 token to refill (110ms)
  await new Promise((resolve) => setTimeout(resolve, 110));

  // Now it should allow 1 request
  const r4 = limiter.consume("test-client", 1);
  assert.equal(r4.allowed, true);
});
