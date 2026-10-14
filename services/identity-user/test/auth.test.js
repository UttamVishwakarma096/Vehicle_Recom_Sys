import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp, SERVICE_NAME } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { createLogger } from "../src/foundation.js";
import { TokenService } from "../src/auth/jwt.js";
import { SessionService } from "../src/auth/sessions.js";

let mongod;
let database;
let tokenService;
let sessionService;
let server;
let baseUrl;
let app;

function extractCookies(response) {
  const list = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  if (list.length > 0) {
    return list.map((c) => c.split(";")[0].trim()).join("; ");
  }
  const raw = response.headers.get("set-cookie") || "";
  return raw.split(";")[0].trim();
}

before(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 },
  });
  const uri = `${mongod.getUri()}vehicle_identity`;
  const logger = createLogger(SERVICE_NAME, () => {});
  database = createDatabase({ logger });
  await database.connect(uri);

  tokenService = new TokenService();
  sessionService = new SessionService({
    getSessionModel: () => database.models.Session,
  });

  app = createApp({
    logger,
    isReady: database.isReady,
    models: database.models,
    tokenService,
    sessionService,
  });

  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (database) {
    await database.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  app?.loginLimiter?.reset();
  app?.registerLimiter?.reset();
  if (database?.connection?.readyState === 1) {
    const collections = database.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
});

test("AUTH-01: valid registration creates regular account, returns 201, and omits password/hash", async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "buyer@example.test",
      password: "securePassword123!",
      displayName: "Sample Buyer",
    }),
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.user.id);
  assert.equal(body.user.email, "buyer@example.test");
  assert.equal(body.user.role, "user");
  assert.equal(body.user.profile.displayName, "Sample Buyer");
  assert.equal(body.user.password, undefined);
  assert.equal(body.user.passwordHash, undefined);
});

test("AUTH-02: duplicate email registration with differing case is rejected with 409", async () => {
  const res1 = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "buyer@example.test",
      password: "securePassword123!",
    }),
  });
  assert.equal(res1.status, 201);

  const res2 = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "BUYER@EXAMPLE.TEST",
      password: "securePassword123!",
    }),
  });
  assert.equal(res2.status, 409);
  const body = await res2.json();
  assert.equal(body.error.code, "EMAIL_ALREADY_EXISTS");
});

test("AUTH-03: login with valid credentials succeeds and returns safe user; invalid credentials return generic 401", async () => {
  await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "login.user@example.test",
      password: "correctPassword123!",
    }),
  });

  // Valid login
  const successRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "LOGIN.USER@EXAMPLE.TEST",
      password: "correctPassword123!",
    }),
  });
  assert.equal(successRes.status, 200);
  const successBody = await successRes.json();
  assert.equal(successBody.user.email, "login.user@example.test");
  assert.ok(successBody.csrfToken);
  assert.equal(successBody.user.passwordHash, undefined);

  const setCookies = successRes.headers.get("set-cookie");
  assert.ok(setCookies);
  assert.match(setCookies, /access_token=/);
  assert.match(setCookies, /refresh_token=/);
  assert.match(setCookies, /HttpOnly/i);

  // Invalid password
  const badPassRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "login.user@example.test",
      password: "wrongPassword123!",
    }),
  });
  assert.equal(badPassRes.status, 401);
  const badPassBody = await badPassRes.json();
  assert.equal(badPassBody.error.code, "INVALID_CREDENTIALS");

  // Unknown email
  const unknownUserRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "unknown@example.test",
      password: "correctPassword123!",
    }),
  });
  assert.equal(unknownUserRes.status, 401);
  const unknownUserBody = await unknownUserRes.json();
  assert.equal(unknownUserBody.error.code, "INVALID_CREDENTIALS");
});

test("AUTH-04: token lifecycle, expired/invalid tokens, refresh rotation, and logout revocation", async () => {
  const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "lifecycle@example.test",
      password: "passwordLifecycle123!",
    }),
  });
  const regBody = await regRes.json();
  const userId = regBody.user.id;

  // Login to get tokens
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "lifecycle@example.test",
      password: "passwordLifecycle123!",
    }),
  });
  const loginBody = await loginRes.json();
  assert.ok(loginBody.csrfToken);
  const cookies = extractCookies(loginRes);

  // Access /api/v1/auth/me with cookies
  const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { cookie: cookies },
  });
  assert.equal(meRes.status, 200);
  const meBody = await meRes.json();
  assert.equal(meBody.user.id, userId);

  // Expired token test
  const expiredToken = tokenService.signAccessToken(
    { id: userId, email: "lifecycle@example.test", role: "user" },
    { expiresInSeconds: -10 },
  );
  const expiredRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { authorization: `Bearer ${expiredToken}` },
  });
  assert.equal(expiredRes.status, 401);

  // Refresh token rotation
  const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
    },
  });
  assert.equal(refreshRes.status, 200);
  const refreshBody = await refreshRes.json();
  assert.ok(refreshBody.csrfToken);
  const refreshedCookies = extractCookies(refreshRes);

  // Replay of old refresh token must fail (it was rotated)
  const replayRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
    },
  });
  assert.equal(replayRes.status, 401);

  // Logout with current cookies
  const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: refreshedCookies,
      "x-csrf-token": refreshBody.csrfToken,
    },
  });
  assert.equal(logoutRes.status, 204);

  // Refreshing after logout must fail
  const postLogoutRefresh = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: refreshedCookies,
    },
  });
  assert.equal(postLogoutRefresh.status, 401);
});

test("AUTH-05: JWKS discovery endpoint exposes valid public keys", async () => {
  for (const path of ["/.well-known/jwks.json", "/api/v1/auth/jwks.json"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200);
    const jwks = await response.json();
    assert.ok(Array.isArray(jwks.keys));
    assert.equal(jwks.keys.length, 1);
    assert.equal(jwks.keys[0].kty, "RSA");
    assert.equal(jwks.keys[0].alg, "RS256");
    assert.equal(jwks.keys[0].use, "sig");
    assert.ok(jwks.keys[0].n);
    assert.ok(jwks.keys[0].e);
  }
});

test("AUTH-06: login rate limiter rejects excessive attempts with 429 and rate limit headers", async () => {
  const email = "ratelimit.login@example.test";
  const ip = "198.51.100.42";
  const headers = {
    "Content-Type": "application/json",
    "x-forwarded-for": ip,
  };
  const body = JSON.stringify({ email, password: "wrong-password-attempt" });

  // 5 attempts consume the bucket
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers,
      body,
    });
    // Expected 401 because credentials are wrong, but NOT rate limited yet
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("x-ratelimit-limit"), "5");
    assert.equal(res.headers.get("x-ratelimit-remaining"), String(4 - i));
    assert.ok(res.headers.get("x-ratelimit-reset"));
  }

  // 6th attempt must be rejected with 429
  const limitedRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers,
    body,
  });
  assert.equal(limitedRes.status, 429);
  assert.equal(limitedRes.headers.get("x-ratelimit-remaining"), "0");
  const retryAfter = limitedRes.headers.get("retry-after");
  assert.ok(retryAfter && Number(retryAfter) > 0);
  const data = await limitedRes.json();
  assert.equal(data.error.code, "RATE_LIMIT_EXCEEDED");
  assert.match(data.error.message, /Too many login attempts/);
});

test("AUTH-07: register rate limiter rejects excessive attempts with 429 and rate limit headers", async () => {
  const ip = "198.51.100.43";
  const headers = {
    "Content-Type": "application/json",
    "x-forwarded-for": ip,
  };

  // 5 registrations consume bucket
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: `driver_${i}@example.test`,
        password: "ValidPassword123!",
      }),
    });
    assert.equal(res.status, 201);
    assert.equal(res.headers.get("x-ratelimit-limit"), "5");
    assert.equal(res.headers.get("x-ratelimit-remaining"), String(4 - i));
  }

  // 6th attempt must be rejected with 429
  const limitedRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "driver_overflow@example.test",
      password: "ValidPassword123!",
    }),
  });
  assert.equal(limitedRes.status, 429);
  assert.equal(limitedRes.headers.get("x-ratelimit-remaining"), "0");
  const retryAfter = limitedRes.headers.get("retry-after");
  assert.ok(retryAfter && Number(retryAfter) > 0);
  const data = await limitedRes.json();
  assert.equal(data.error.code, "RATE_LIMIT_EXCEEDED");
  assert.match(data.error.message, /Too many registration attempts/);
});

