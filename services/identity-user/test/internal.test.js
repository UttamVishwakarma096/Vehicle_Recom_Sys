import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp, SERVICE_NAME } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { createLogger } from "../src/foundation.js";

let mongod;
let database;
let server;
let baseUrl;

const TEST_SERVICE_SECRET = "test-internal-identity-secret";

before(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 },
  });
  const uri = `${mongod.getUri()}vehicle_identity`;
  const logger = createLogger(SERVICE_NAME, () => {});
  database = createDatabase({ logger });
  await database.connect(uri);

  const app = createApp({
    logger,
    isReady: database.isReady,
    models: database.models,
    internalSecret: TEST_SERVICE_SECRET,
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
  if (database?.models?.User) {
    await database.models.User.deleteMany({});
  }
});

test("ERR-03: internal identity route rejects callers without service identity or with invalid identity", async () => {
  // Without service key
  const noKeyRes = await fetch(`${baseUrl}/internal/v1/users/665000000000000000000001/preferences`);
  assert.equal(noKeyRes.status, 401);
  const noKeyJson = await noKeyRes.json();
  assert.equal(noKeyJson.error.code, "UNAUTHORIZED");

  // With invalid service key
  const badKeyRes = await fetch(`${baseUrl}/internal/v1/users/665000000000000000000001/preferences`, {
    headers: { "X-Internal-Service-Key": "bad-secret" },
  });
  assert.equal(badKeyRes.status, 403);
  const badKeyJson = await badKeyRes.json();
  assert.equal(badKeyJson.error.code, "FORBIDDEN");
});

test("GET /internal/v1/users/:userId/preferences retrieves user preferences for valid service", async () => {
  const User = database.models.User;
  const user = await User.create({
    email: "prefs.internal@example.test",
    passwordHash: "dummyHashForInternalTest123456",
    role: "user",
    preferences: {
      budget: { min: 800000, max: 1500000, priceType: "ex_showroom" },
      vehicleTypes: ["suv"],
    },
  });

  const res = await fetch(`${baseUrl}/internal/v1/users/${user._id.toString()}/preferences`, {
    headers: { "X-Internal-Service-Key": TEST_SERVICE_SECRET },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.userId, user._id.toString());
  assert.equal(data.preferences.budget.min, 800000);
  assert.deepEqual(data.preferences.vehicleTypes, ["suv"]);

  // Non-existent user returns 404
  const notFoundRes = await fetch(`${baseUrl}/internal/v1/users/665000000000000000000999/preferences`, {
    headers: { "X-Internal-Service-Key": TEST_SERVICE_SECRET },
  });
  assert.equal(notFoundRes.status, 404);

  // Malformed ID returns 400
  const malformedRes = await fetch(`${baseUrl}/internal/v1/users/invalid-id/preferences`, {
    headers: { "X-Internal-Service-Key": TEST_SERVICE_SECRET },
  });
  assert.equal(malformedRes.status, 400);
});
