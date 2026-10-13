import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
import crypto from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp, SERVICE_NAME } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { createLogger, HttpError } from "../src/foundation.js";
import { TokenVerifier } from "../src/auth/jwt.js";

let mongod;
let database;
let server;
let baseUrl;
let keyPair;
let tokenVerifier;

const USER_A_ID = "665000000000000000000001";
const USER_B_ID = "665000000000000000000002";

const VEHICLE_1_ID = "666000000000000000000001";
const VEHICLE_2_ID = "666000000000000000000002";
const VEHICLE_3_ID = "666000000000000000000003";

const MOCK_VEHICLE_1 = {
  id: VEHICLE_1_ID,
  make: "Tata",
  model: "Nexon",
  variant: "XZ+",
  modelYear: 2023,
  bodyType: "suv",
  fuelType: "petrol",
  transmission: "manual",
  seatingCapacity: 5,
  status: "published",
  prices: [
    { type: "ex_showroom", amount: "800000", currency: "INR" },
    { type: "on_road", amount: "920000", currency: "INR" },
  ],
  specifications: {
    claimedMileage: { value: 17.5, unit: "km/l", verified: true },
    power: { value: 120, unit: "hp", verified: true },
  },
};

const MOCK_VEHICLE_2 = {
  id: VEHICLE_2_ID,
  make: "Maruti Suzuki",
  model: "Brezza",
  variant: "ZXi",
  modelYear: 2024,
  bodyType: "suv",
  fuelType: "petrol",
  transmission: "manual",
  seatingCapacity: 5,
  status: "published",
  prices: [
    { type: "ex_showroom", amount: "850000", currency: "INR" },
    { type: "on_road", amount: "980000", currency: "INR" },
  ],
  specifications: {
    claimedMileage: { value: 19.8, unit: "km/l", verified: true },
    power: { value: 103, unit: "hp", verified: true },
  },
};

const mockCatalogVehicles = new Map([
  [VEHICLE_1_ID, MOCK_VEHICLE_1],
  [VEHICLE_2_ID, MOCK_VEHICLE_2],
]);

const mockUserPreferences = new Map([
  [
    USER_A_ID,
    {
      budget: { min: 500000, max: 1000000, priceType: "ex_showroom", currency: "INR" },
      vehicleTypes: ["suv"],
      fuelTypes: ["petrol"],
      transmissions: ["manual"],
      minimumSeats: 5,
      drivingEnvironment: "mixed",
      annualDistanceKm: 12000,
      priorities: {
        reliability: 4,
        maintenanceCost: 3,
        fuelEfficiency: 5,
        safety: 4,
        performance: 3,
      },
    },
  ],
]);

const mockCatalogClient = {
  async searchCandidates(filters = {}) {
    let items = Array.from(mockCatalogVehicles.values());
    if (filters.vehicleTypes?.length) {
      items = items.filter((v) => filters.vehicleTypes.includes(v.bodyType));
    }
    if (filters.fuelTypes?.length) {
      items = items.filter((v) => filters.fuelTypes.includes(v.fuelType));
    }
    return {
      items,
      pagination: { page: 1, limit: items.length, totalItems: items.length, totalPages: 1 },
    };
  },
  async lookupVehicles(vehicleIds = []) {
    const vehicles = [];
    const unavailableIds = [];
    for (const id of vehicleIds) {
      if (mockCatalogVehicles.has(id)) {
        vehicles.push(mockCatalogVehicles.get(id));
      } else {
        unavailableIds.push(id);
      }
    }
    return { vehicles, unavailableIds };
  },
};

const mockIdentityClient = {
  async getUserPreferences(userId) {
    if (!mockUserPreferences.has(userId)) {
      throw new HttpError(404, "USER_NOT_FOUND", "User not found.");
    }
    return mockUserPreferences.get(userId);
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

  mongod = await MongoMemoryServer.create({ instance: { dbName: "vehicle_recommendations" } });
  const uri = mongod.getUri();
  database = createDatabase({ logger: createLogger(SERVICE_NAME, () => {}) });
  await database.connect(uri);

  const app = createApp({
    logger: createLogger(SERVICE_NAME, () => {}),
    isReady: database.isReady,
    models: database.models,
    tokenVerifier,
    catalogClient: mockCatalogClient,
    identityClient: mockIdentityClient,
  });

  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
  if (database) {
    await database.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  if (database.models.Favorite) {
    await database.models.Favorite.deleteMany({});
  }
});

// REC tests
test("REC-01: Anonymous request to /api/v1/recommendations is rejected with 401 UNAUTHORIZED", async () => {
  const payload = {
    preferences: {
      budget: { min: 500000, max: 1000000, priceType: "ex_showroom", currency: "INR" },
      vehicleTypes: ["suv"],
    },
  };

  const response = await fetch(`${baseUrl}/api/v1/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.error.code, "UNAUTHORIZED");
});

test("REC-01b: Authenticated user can submit recommendation preferences and receive ranked items", async () => {
  const token = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });
  const payload = {
    preferences: {
      budget: { min: 500000, max: 1000000, priceType: "ex_showroom", currency: "INR" },
      vehicleTypes: ["suv"],
      fuelTypes: ["petrol"],
      transmissions: ["manual"],
      minimumSeats: 5,
      drivingEnvironment: "mixed",
      annualDistanceKm: 12000,
      priorities: {
        reliability: 4,
        maintenanceCost: 3,
        fuelEfficiency: 5,
        safety: 4,
        performance: 2,
      },
    },
    page: 1,
    limit: 20,
  };

  const response = await fetch(`${baseUrl}/api/v1/recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  assert.equal(response.status, 200);
  const data = await response.json();

  assert.equal(data.ruleVersion, "rules-v1");
  assert.ok(Array.isArray(data.items));
  assert.equal(data.items.length, 2);
  assert.equal(data.pagination.page, 1);
  assert.equal(data.pagination.totalItems, 2);
  assert.ok(data.scoreDisclaimer.includes("not a guarantee"));

  const first = data.items[0];
  assert.equal(first.rank, 1);
  assert.ok(typeof first.matchScore === "number");
  assert.ok(first.vehicle.id);
  assert.ok(Array.isArray(first.reasons));
  assert.ok(Array.isArray(first.missingData));
});

test("REC-02: Invalid recommendation preferences return 400 with fieldErrors", async () => {
  const token = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });
  const invalidPayload = {
    preferences: {
      budget: { min: 1000000, max: 500000, currency: "INR" }, // min > max
      minimumSeats: 0, // < 1
      priorities: {
        fuelEfficiency: 10, // > 5
      },
    },
  };

  const response = await fetch(`${baseUrl}/api/v1/recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(invalidPayload),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error.code, "VALIDATION_FAILED");
  assert.ok(Array.isArray(data.error.fieldErrors));
  assert.ok(data.error.fieldErrors.some((fe) => fe.field === "budget.min"));
  assert.ok(data.error.fieldErrors.some((fe) => fe.field === "minimumSeats"));
  assert.ok(data.error.fieldErrors.some((fe) => fe.field === "priorities.fuelEfficiency"));
});

test("REC-03: Empty results return 200 with empty items and safe explanation without relaxing constraints", async () => {
  const token = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });
  const payload = {
    preferences: {
      budget: { min: 100000, max: 200000, priceType: "ex_showroom", currency: "INR" },
      vehicleTypes: ["convertible"], // no matching vehicles
    },
  };

  const response = await fetch(`${baseUrl}/api/v1/recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.totalItems, 0);
});

test("REC-04: Authenticated user can request recommendations using saved preferences", async () => {
  const token = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });

  const response = await fetch(`${baseUrl}/api/v1/recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ useSavedPreferences: true }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ruleVersion, "rules-v1");
  assert.ok(data.items.length > 0);
});

test("REC-05: Requesting useSavedPreferences without authentication returns 401", async () => {
  const response = await fetch(`${baseUrl}/api/v1/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ useSavedPreferences: true }),
  });

  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.error.code, "UNAUTHORIZED");
});

test("REC-06: Providing both preferences and useSavedPreferences: true returns 400", async () => {
  const token = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });

  const response = await fetch(`${baseUrl}/api/v1/recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      useSavedPreferences: true,
      preferences: { minimumSeats: 5 },
    }),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.error.code, "INVALID_INPUT");
});

// COMP tests
test("COMP-01: Anonymous request to /api/v1/compare is rejected with 401 UNAUTHORIZED", async () => {
  const response = await fetch(`${baseUrl}/api/v1/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicleIds: [VEHICLE_1_ID, VEHICLE_2_ID],
    }),
  });

  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.error.code, "UNAUTHORIZED");
});

test("COMP-01b: Authenticated user can request formatted comparison table for 2-4 published vehicles", async () => {
  const token = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });

  const response = await fetch(`${baseUrl}/api/v1/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      vehicleIds: [VEHICLE_1_ID, VEHICLE_2_ID],
    }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.vehicles.length, 2);
  assert.equal(data.vehicles[0].id, VEHICLE_1_ID);
  assert.equal(data.vehicles[1].id, VEHICLE_2_ID);

  assert.ok(Array.isArray(data.comparison));
  const makeRow = data.comparison.find((r) => r.key === "make");
  assert.ok(makeRow);
  assert.equal(makeRow.values[VEHICLE_1_ID], "Tata");
  assert.equal(makeRow.values[VEHICLE_2_ID], "Maruti Suzuki");
});

test("COMP-02: Comparison rejects duplicate identifiers or out-of-bound vehicle count", async () => {
  const token = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });

  // Duplicates
  const dupRes = await fetch(`${baseUrl}/api/v1/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ vehicleIds: [VEHICLE_1_ID, VEHICLE_1_ID] }),
  });
  assert.equal(dupRes.status, 400);
  assert.equal((await dupRes.json()).error.code, "DUPLICATE_IDENTIFIERS");

  // Less than 2
  const singleRes = await fetch(`${baseUrl}/api/v1/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ vehicleIds: [VEHICLE_1_ID] }),
  });
  assert.equal(singleRes.status, 400);
  assert.equal((await singleRes.json()).error.code, "INVALID_COUNT");

  // More than 4
  const fiveRes = await fetch(`${baseUrl}/api/v1/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      vehicleIds: [
        "666000000000000000000001",
        "666000000000000000000002",
        "666000000000000000000003",
        "666000000000000000000004",
        "666000000000000000000005",
      ],
    }),
  });
  assert.equal(fiveRes.status, 400);
  assert.equal((await fiveRes.json()).error.code, "INVALID_COUNT");
});

test("COMP-03: Comparison returns 404 if any requested vehicle is unpublished or missing", async () => {
  const token = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });

  const response = await fetch(`${baseUrl}/api/v1/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      vehicleIds: [VEHICLE_1_ID, VEHICLE_3_ID], // VEHICLE_3_ID does not exist
    }),
  });

  assert.equal(response.status, 404);
  const data = await response.json();
  assert.equal(data.error.code, "VEHICLE_NOT_FOUND");
});

test("COMP-04: AI comparison conclusion endpoint returns structured comparative verdict with summary, category winners, and final takeaway", async () => {
  const response = await fetch(`${baseUrl}/api/v1/compare/conclusion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-gemini-api-key": "test-key",
    },
    body: JSON.stringify({
      vehicleIds: [VEHICLE_1_ID, VEHICLE_2_ID],
    }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.success, true);
  assert.ok(data.conclusion);
  assert.ok(data.conclusion.summary);
  assert.equal(data.conclusion.verdicts.length, 2);
  assert.ok(Array.isArray(data.conclusion.categoryWinners));
  assert.ok(data.conclusion.finalTakeaway);
  assert.equal(response.headers.get("x-ratelimit-limit"), "3");
});

test("COMP-05: AI comparison conclusion rate limits rapid bursts via Token Bucket and returns 429 RATE_LIMIT_EXCEEDED with Retry-After header", async () => {
  const clientIp = "192.168.20.55";
  const headers = {
    "Content-Type": "application/json",
    "x-forwarded-for": clientIp,
    "x-gemini-api-key": "test-key",
  };
  const body = JSON.stringify({
    vehicleIds: [VEHICLE_1_ID, VEHICLE_2_ID],
  });

  // Consume 3 burst tokens
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${baseUrl}/api/v1/compare/conclusion`, {
      method: "POST",
      headers,
      body,
    });
    assert.equal(res.status, 200, `Comparison conclusion request ${i + 1} should succeed`);
  }

  // 4th request must be rejected with 429
  const limitedRes = await fetch(`${baseUrl}/api/v1/compare/conclusion`, {
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

// FAV tests
test("FAV-01: Authenticated user can add, list, and remove favorites", async () => {
  const token = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });

  // 1. Initial empty list
  const emptyRes = await fetch(`${baseUrl}/api/v1/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(emptyRes.status, 200);
  assert.deepEqual((await emptyRes.json()).items, []);

  // 2. Add VEHICLE_1_ID
  const addRes = await fetch(`${baseUrl}/api/v1/favorites/${VEHICLE_1_ID}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(addRes.status, 201);
  const addData = await addRes.json();
  assert.equal(addData.vehicleId, VEHICLE_1_ID);

  // 3. List contains VEHICLE_1_ID with resolved catalog data
  const listRes = await fetch(`${baseUrl}/api/v1/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.items.length, 1);
  assert.equal(listData.items[0].vehicleId, VEHICLE_1_ID);
  assert.equal(listData.items[0].vehicle.make, "Tata");
  assert.equal(listData.items[0].status, "published");

  // 4. Repeated add is idempotent (returns 200, no duplicate created)
  const dupAddRes = await fetch(`${baseUrl}/api/v1/favorites/${VEHICLE_1_ID}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(dupAddRes.status, 200);

  const count = await database.models.Favorite.countDocuments({
    userId: USER_A_ID,
    vehicleId: VEHICLE_1_ID,
  });
  assert.equal(count, 1);

  // 5. Remove favorite returns 204
  const delRes = await fetch(`${baseUrl}/api/v1/favorites/${VEHICLE_1_ID}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(delRes.status, 204);

  // 6. Repeated removal is idempotent (returns 204)
  const delDupRes = await fetch(`${baseUrl}/api/v1/favorites/${VEHICLE_1_ID}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(delDupRes.status, 204);

  // 7. List is now empty
  const finalListRes = await fetch(`${baseUrl}/api/v1/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal((await finalListRes.json()).items.length, 0);
});

test("FAV-02: Adding an unpublished or non-existent vehicle returns 404", async () => {
  const token = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });

  const response = await fetch(`${baseUrl}/api/v1/favorites/${VEHICLE_3_ID}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(response.status, 404);
  const data = await response.json();
  assert.equal(data.error.code, "VEHICLE_NOT_FOUND");
});

test("FAV-03: Unauthenticated user cannot access favorites endpoints", async () => {
  const getRes = await fetch(`${baseUrl}/api/v1/favorites`);
  assert.equal(getRes.status, 401);

  const putRes = await fetch(`${baseUrl}/api/v1/favorites/${VEHICLE_1_ID}`, { method: "PUT" });
  assert.equal(putRes.status, 401);

  const delRes = await fetch(`${baseUrl}/api/v1/favorites/${VEHICLE_1_ID}`, { method: "DELETE" });
  assert.equal(delRes.status, 401);
});

test("FAV-04: User A cannot read or delete User B's favorites", async () => {
  const tokenA = createJwt({ id: USER_A_ID, email: "user_a@example.com", role: "user" });
  const tokenB = createJwt({ id: USER_B_ID, email: "user_b@example.com", role: "user" });

  // User B adds VEHICLE_1_ID
  await fetch(`${baseUrl}/api/v1/favorites/${VEHICLE_1_ID}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  // User A lists favorites -> should NOT see User B's favorite
  const listARes = await fetch(`${baseUrl}/api/v1/favorites`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const listAData = await listARes.json();
  assert.equal(listAData.items.length, 0);

  // User A attempts to delete VEHICLE_1_ID -> returns 204 (idempotent for User A)
  await fetch(`${baseUrl}/api/v1/favorites/${VEHICLE_1_ID}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  // User B's favorite remains untouched in database
  const countB = await database.models.Favorite.countDocuments({
    userId: USER_B_ID,
    vehicleId: VEHICLE_1_ID,
  });
  assert.equal(countB, 1);
});

// ML-01 test
test("ML-01: Longevity prediction endpoint returns 503 FEATURE_NOT_ENABLED", async () => {
  const response = await fetch(`${baseUrl}/api/v1/longevity/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId: VEHICLE_1_ID }),
  });

  assert.equal(response.status, 503);
  const data = await response.json();
  assert.equal(data.error.code, "FEATURE_NOT_ENABLED");
  assert.ok(data.error.message.includes("Longevity prediction is disabled"));
});
