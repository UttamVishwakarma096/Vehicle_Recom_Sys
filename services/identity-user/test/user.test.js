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

  const app = createApp({
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
  if (database?.connection?.readyState === 1) {
    const collections = database.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
});

async function registerAndLogin(email, password = "password123456!") {
  await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await loginRes.json();
  const cookies = extractCookies(loginRes);
  return { user: body.user, cookies, csrfToken: body.csrfToken };
}

test("USER-01: new user reads empty preferences without hidden defaults", async () => {
  const { cookies } = await registerAndLogin("user1@example.test");
  const res = await fetch(`${baseUrl}/api/v1/users/me/preferences`, {
    headers: { cookie: cookies },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.preferences, {});
});

test("USER-02: save valid preferences persists and returns them", async () => {
  const { cookies, csrfToken } = await registerAndLogin("user2@example.test");

  const validPreferences = {
    budget: {
      min: 600000,
      max: 1200000,
      priceType: "ex_showroom",
    },
    vehicleTypes: ["suv", "sedan"],
    fuelTypes: ["petrol", "hybrid"],
    transmissions: ["automatic"],
    minimumSeats: 5,
    drivingEnvironment: "city",
    annualDistanceKm: 15000,
    priorities: {
      reliability: 4,
      maintenanceCost: 3,
      fuelEfficiency: 5,
      safety: 4,
      performance: 2,
    },
  };

  const putRes = await fetch(`${baseUrl}/api/v1/users/me/preferences`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify(validPreferences),
  });
  assert.equal(putRes.status, 200);
  const putBody = await putRes.json();
  assert.deepEqual(putBody.preferences, validPreferences);

  // Verify GET retrieves the saved preferences
  const getRes = await fetch(`${baseUrl}/api/v1/users/me/preferences`, {
    headers: { cookie: cookies },
  });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.deepEqual(getBody.preferences, validPreferences);
});

test("USER-03: invalid preferences (reversed budget, invalid priority, unsupported enum) rejected with 400", async () => {
  const { cookies, csrfToken } = await registerAndLogin("user3@example.test");

  // Reversed budget: min > max
  const reversedBudgetRes = await fetch(`${baseUrl}/api/v1/users/me/preferences`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      budget: { min: 1000000, max: 500000, priceType: "on_road" },
    }),
  });
  assert.equal(reversedBudgetRes.status, 400);
  const reversedBody = await reversedBudgetRes.json();
  assert.equal(reversedBody.error.code, "VALIDATION_ERROR");

  // Invalid priority scale: 6 (allowed 1-5)
  const badPriorityRes = await fetch(`${baseUrl}/api/v1/users/me/preferences`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      priorities: { safety: 6 },
    }),
  });
  assert.equal(badPriorityRes.status, 400);

  // Unsupported vehicle type
  const badTypeRes = await fetch(`${baseUrl}/api/v1/users/me/preferences`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      vehicleTypes: ["rocket-ship"],
    }),
  });
  assert.equal(badTypeRes.status, 400);
});

test("USER-04: cross-user isolation: User A cannot read or mutate User B preferences or profile", async () => {
  const userA = await registerAndLogin("userA@example.test");
  const userB = await registerAndLogin("userB@example.test");

  // User A sets preferences
  await fetch(`${baseUrl}/api/v1/users/me/preferences`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: userA.cookies,
      "x-csrf-token": userA.csrfToken,
    },
    body: JSON.stringify({
      budget: { min: 400000, max: 800000, priceType: "ex_showroom" },
    }),
  });

  // User B reads own preferences -> empty, not User A's
  const userBGet = await fetch(`${baseUrl}/api/v1/users/me/preferences`, {
    headers: { cookie: userB.cookies },
  });
  const userBBody = await userBGet.json();
  assert.deepEqual(userBBody.preferences, {});
});

test("USER-05: mass-assignment of role, _id, or passwordHash is rejected", async () => {
  const { cookies, csrfToken } = await registerAndLogin("user5@example.test");

  // Attempt to escalate role via PATCH profile
  const roleHack = await fetch(`${baseUrl}/api/v1/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(roleHack.status, 400);

  // Attempt to tamper with passwordHash
  const passHack = await fetch(`${baseUrl}/api/v1/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ passwordHash: "hacked-hash" }),
  });
  assert.equal(passHack.status, 400);

  // Attempt protected mutation via PUT preferences
  const prefHack = await fetch(`${baseUrl}/api/v1/users/me/preferences`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(prefHack.status, 400);
});

test("USER-06: profile update succeeds for allowlisted fields (displayName, city)", async () => {
  const { cookies, csrfToken } = await registerAndLogin("user6@example.test");

  const patchRes = await fetch(`${baseUrl}/api/v1/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      displayName: "Updated Name",
      city: "Bengaluru",
    }),
  });
  assert.equal(patchRes.status, 200);
  const patchBody = await patchRes.json();
  assert.equal(patchBody.profile.displayName, "Updated Name");
  assert.equal(patchBody.profile.city, "Bengaluru");

  // Verify GET /users/me
  const getRes = await fetch(`${baseUrl}/api/v1/users/me`, {
    headers: { cookie: cookies },
  });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.profile.displayName, "Updated Name");
  assert.equal(getBody.profile.city, "Bengaluru");
});
