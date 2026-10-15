import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
import crypto from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp, SERVICE_NAME } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { createLogger } from "../src/foundation.js";
import { TokenVerifier } from "../src/auth/jwt.js";

let mongod;
let database;
let server;
let baseUrl;
let keyPair;
let tokenVerifier;

const ADMIN_ID = "665000000000000000000001";
const USER_ID = "665000000000000000000002";

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
  const sig = crypto.sign("sha256", Buffer.from(data), keyPair.privateKey).toString("base64url");
  return `${data}.${sig}`;
}

let adminToken;
let userToken;

before(async () => {
  keyPair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  tokenVerifier = new TokenVerifier({ publicKey: keyPair.publicKey });

  adminToken = createJwt({ id: ADMIN_ID, email: "admin@example.test", role: "admin" });
  userToken = createJwt({ id: USER_ID, email: "user@example.test", role: "user" });

  mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 },
  });
  const uri = `${mongod.getUri()}vehicle_catalog`;
  const logger = createLogger(SERVICE_NAME, () => {});
  database = createDatabase({ logger });
  await database.connect(uri);

  const app = createApp({
    logger,
    isReady: database.isReady,
    models: database.models,
    tokenVerifier,
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
  if (database?.models?.Vehicle) {
    await database.models.Vehicle.deleteMany({});
  }
});

// ADM-01: FR-ADMIN-01 - No credential -> 401; no database mutation
test("ADM-01: unauthenticated vehicle creation is rejected with 401", async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ make: "Tata", model: "Nexon" }),
  });

  assert.equal(response.status, 401);
  const json = await response.json();
  assert.equal(json.error.code, "UNAUTHORIZED");

  const count = await database.models.Vehicle.countDocuments();
  assert.equal(count, 0);
});

// ADM-02: FR-ADMIN-01 - Regular-user credential -> 403; no database mutation
test("ADM-02: regular user cannot create, update, or publish vehicles", async () => {
  // Try create
  const createRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ make: "Tata", model: "Nexon" }),
  });
  assert.equal(createRes.status, 403);
  const createJson = await createRes.json();
  assert.equal(createJson.error.code, "FORBIDDEN");

  // Create a draft vehicle as admin first
  const seedRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ make: "Tata", model: "Nexon" }),
  });
  const vehicle = await seedRes.json();

  // Try update as regular user
  const updateRes = await fetch(`${baseUrl}/api/v1/admin/vehicles/${vehicle.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ variant: "XZ Plus" }),
  });
  assert.equal(updateRes.status, 403);

  // Try publish as regular user
  const publishRes = await fetch(`${baseUrl}/api/v1/admin/vehicles/${vehicle.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ status: "published" }),
  });
  assert.equal(publishRes.status, 403);
});

// ADM-03: FR-ADMIN-01 - Admin credential -> Create valid synthetic draft record -> 201; actor derives from verified identity
test("ADM-03: admin creates valid synthetic draft record with verified actor identity", async () => {
  const payload = {
    make: "Mahindra",
    model: "XUV700",
    modelYear: 2024,
    variant: "AX7",
    bodyType: "suv",
    fuelType: "diesel",
    transmission: "automatic",
    seatingCapacity: 7,
    prices: [
      {
        type: "ex_showroom",
        amount: 2150000,
        currency: "INR",
      },
    ],
    dataSources: [
      {
        provider: "Internal Test Provider",
        retrievedAt: new Date().toISOString(),
      },
    ],
  };

  const response = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(payload),
  });

  assert.equal(response.status, 201);
  const data = await response.json();
  assert.ok(data.id);
  assert.equal(data.make, "Mahindra");
  assert.equal(data.model, "XUV700");
  assert.equal(data.status, "draft");
  assert.equal(data.createdBy, ADMIN_ID);
  assert.equal(data.prices[0].amount, 2150000);
  assert.equal(data.prices[0].currency, "INR");
});

// ADM-04: FR-ADMIN-01/02 - Admin credential -> Submit invalid fields or unknown/protected keys -> Validation error
test("ADM-04: invalid fields or protected/unknown keys are rejected with 400", async () => {
  // Submit protected fields: _id, createdBy
  const protectedRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      make: "Tata",
      model: "Punch",
      createdBy: "attacker-id",
      _id: "665000000000000000000999",
    }),
  });
  assert.equal(protectedRes.status, 400);
  const protectedJson = await protectedRes.json();
  assert.equal(protectedJson.error.code, "VALIDATION_FAILED");
  assert.ok(protectedJson.error.fieldErrors.some((fe) => fe.field === "createdBy"));
  assert.ok(protectedJson.error.fieldErrors.some((fe) => fe.field === "_id"));

  // Submit unknown key
  const unknownRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      make: "Tata",
      model: "Punch",
      randomProperty: "not-allowed",
    }),
  });
  assert.equal(unknownRes.status, 400);
  const unknownJson = await unknownRes.json();
  assert.ok(unknownJson.error.fieldErrors.some((fe) => fe.field === "randomProperty"));

  // Submit invalid price (amount <= 0, currency not INR)
  const invalidPriceRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      make: "Tata",
      model: "Punch",
      prices: [
        {
          type: "ex_showroom",
          amount: -500,
          currency: "USD",
        },
      ],
    }),
  });
  assert.equal(invalidPriceRes.status, 400);
  const priceJson = await invalidPriceRes.json();
  assert.ok(priceJson.error.fieldErrors.some((fe) => fe.field.includes("amount")));
  assert.ok(priceJson.error.fieldErrors.some((fe) => fe.field.includes("currency")));

  // No partial record should exist
  const count = await database.models.Vehicle.countDocuments();
  assert.equal(count, 0);
});

// ADM-05: FR-ADMIN-02 - Admin credential; draft record -> Publish with valid required data, then missing provenance
test("ADM-05: publication requires valid pricing and data provenance preconditions", async () => {
  // Create draft with make/model only (no prices, no provenance)
  const createRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ make: "Hyundai", model: "Creta" }),
  });
  assert.equal(createRes.status, 201);
  const vehicle = await createRes.json();
  assert.equal(vehicle.status, "draft");

  // Attempt to publish without prices and provenance -> 409
  const pubFailRes = await fetch(`${baseUrl}/api/v1/admin/vehicles/${vehicle.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "published" }),
  });
  assert.equal(pubFailRes.status, 409);
  const pubFailJson = await pubFailRes.json();
  assert.equal(pubFailJson.error.code, "PUBLICATION_PRECONDITION_FAILED");

  // Update vehicle to add valid price and provenance
  const updateRes = await fetch(`${baseUrl}/api/v1/admin/vehicles/${vehicle.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      prices: [{ type: "ex_showroom", amount: 1100000, currency: "INR" }],
      dataSources: [
        {
          provider: "Manufacturer Catalog",
          retrievedAt: new Date().toISOString(),
        },
      ],
    }),
  });
  assert.equal(updateRes.status, 200);

  // Publish again -> 200 OK
  const pubOkRes = await fetch(`${baseUrl}/api/v1/admin/vehicles/${vehicle.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "published" }),
  });
  assert.equal(pubOkRes.status, 200);
  const published = await pubOkRes.json();
  assert.equal(published.status, "published");
  assert.ok(published.verifiedAt);
  assert.equal(published.verifiedBy, ADMIN_ID);
});

// ADM-06: FR-ADMIN-02 - Admin credential; existing record -> Unpublish / delete
test("ADM-06: vehicle unpublish and delete lifecycle operates safely", async () => {
  // Create and publish a vehicle
  const createRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      make: "Maruti",
      model: "Swift",
      prices: [{ type: "ex_showroom", amount: 650000, currency: "INR" }],
      dataSources: [{ provider: "Test", retrievedAt: new Date().toISOString() }],
    }),
  });
  const vehicle = await createRes.json();

  // Publish it
  await fetch(`${baseUrl}/api/v1/admin/vehicles/${vehicle.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "published" }),
  });

  // Unpublish it
  const unpubRes = await fetch(`${baseUrl}/api/v1/admin/vehicles/${vehicle.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "unpublished" }),
  });
  assert.equal(unpubRes.status, 200);
  assert.equal((await unpubRes.json()).status, "unpublished");

  // Public detail cannot see unpublished vehicle
  const pubGetRes = await fetch(`${baseUrl}/api/v1/vehicles/${vehicle.id}`);
  assert.equal(pubGetRes.status, 404);

  // Delete vehicle
  const delRes = await fetch(`${baseUrl}/api/v1/admin/vehicles/${vehicle.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(delRes.status, 204);

  // Admin cannot find deleted vehicle
  const delCheckRes = await fetch(`${baseUrl}/api/v1/admin/vehicles/${vehicle.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ variant: "ZXi" }),
  });
  assert.equal(delCheckRes.status, 404);
});

// ADM-07: FR-ADMIN-03 - Admin and regular accounts -> List management records
test("ADM-07: admin lists management records; regular user denied", async () => {
  // Seed two draft vehicles and one published vehicle
  await database.models.Vehicle.create([
    { make: "Tata", model: "Tiago", status: "draft", createdBy: ADMIN_ID },
    { make: "Tata", model: "Tigor", status: "draft", createdBy: ADMIN_ID },
    {
      make: "Honda",
      model: "City",
      status: "published",
      createdBy: ADMIN_ID,
      prices: [{ type: "ex_showroom", amount: 1200000, currency: "INR" }],
      dataSources: [{ provider: "Honda", retrievedAt: new Date() }],
    },
  ]);

  // Regular user gets 403
  const userListRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(userListRes.status, 403);

  // Admin gets 200 with all 3 vehicles
  const adminListRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminListRes.status, 200);
  const data = await adminListRes.json();
  assert.equal(data.pagination.totalItems, 3);
  assert.equal(data.items.length, 3);

  // Filter by status=draft
  const draftListRes = await fetch(`${baseUrl}/api/v1/admin/vehicles?status=draft`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(draftListRes.status, 200);
  const draftData = await draftListRes.json();
  assert.equal(draftData.pagination.totalItems, 2);
  assert.ok(draftData.items.every((item) => item.status === "draft"));

  // Filter by make=Honda
  const makeListRes = await fetch(`${baseUrl}/api/v1/admin/vehicles?make=Honda`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(makeListRes.status, 200);
  const makeData = await makeListRes.json();
  assert.equal(makeData.pagination.totalItems, 1);
  assert.equal(makeData.items[0].make, "Honda");
});

// CAT-04: FR-CAT-03 - Admin API available -> Create catalog record with missing required or invalid price fields
test("CAT-04: missing required make/model or invalid price prevents record creation", async () => {
  // Missing make
  const noMakeRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ model: "Curvv" }),
  });
  assert.equal(noMakeRes.status, 400);
  const noMakeJson = await noMakeRes.json();
  assert.ok(noMakeJson.error.fieldErrors.some((fe) => fe.field === "make"));

  // Missing model
  const noModelRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ make: "Tata" }),
  });
  assert.equal(noModelRes.status, 400);
  const noModelJson = await noModelRes.json();
  assert.ok(noModelJson.error.fieldErrors.some((fe) => fe.field === "model"));

  // Invalid price amount (zero)
  const zeroPriceRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      make: "Tata",
      model: "Curvv",
      prices: [{ type: "ex_showroom", amount: 0, currency: "INR" }],
    }),
  });
  assert.equal(zeroPriceRes.status, 400);

  const count = await database.models.Vehicle.countDocuments();
  assert.equal(count, 0);
});

// CAT-05: FR-CAT-03 - Test catalog fixture has missing specs -> Read details -> Missing/unknown not converted to zero or guessed value
test("CAT-05: missing specs remain undefined and are never converted to zero or guesses", async () => {
  const created = await database.models.Vehicle.create({
    make: "Toyota",
    model: "Innova Hycross",
    status: "published",
    createdBy: ADMIN_ID,
    prices: [{ type: "ex_showroom", amount: 1977000, currency: "INR" }],
    dataSources: [{ provider: "Toyota Official", retrievedAt: new Date() }],
  });

  const response = await fetch(`${baseUrl}/api/v1/vehicles/${created._id.toString()}`);
  assert.equal(response.status, 200);
  const data = await response.json();

  // Missing specs must NOT be zero or guessed strings
  assert.equal(data.seatingCapacity, undefined);
  assert.equal(data.modelYear, undefined);
  assert.equal(data.bodyType, undefined);
  assert.equal(data.specifications, undefined);
});

// CAT-06: FR-CAT-03 - Test fixture has price entries -> Read record with ex-showroom/on-road/used fields -> Price types remain distinct
test("CAT-06: ex-showroom, on-road, and used price types remain distinct with valid INR amounts", async () => {
  const created = await database.models.Vehicle.create({
    make: "Mahindra",
    model: "Thar",
    status: "published",
    createdBy: ADMIN_ID,
    prices: [
      {
        type: "ex_showroom",
        amount: 1125000,
        currency: "INR",
      },
      {
        type: "on_road",
        amount: 1350000,
        currency: "INR",
      },
      {
        type: "used",
        amount: 950000,
        currency: "INR",
      },
    ],
    dataSources: [{ provider: "Dealer Network", retrievedAt: new Date() }],
  });

  const response = await fetch(`${baseUrl}/api/v1/vehicles/${created._id.toString()}`);
  assert.equal(response.status, 200);
  const data = await response.json();

  assert.equal(data.prices.length, 3);
  const exShowroom = data.prices.find((p) => p.type === "ex_showroom");
  const onRoad = data.prices.find((p) => p.type === "on_road");
  const used = data.prices.find((p) => p.type === "used");

  assert.ok(exShowroom);
  assert.equal(exShowroom.amount, 1125000);
  assert.equal(exShowroom.currency, "INR");

  assert.ok(onRoad);
  assert.equal(onRoad.amount, 1350000);
  assert.equal(onRoad.currency, "INR");

  assert.ok(used);
  assert.equal(used.amount, 950000);
  assert.equal(used.currency, "INR");
});

// Draft isolation: public route cannot access draft or unpublished vehicles
test("draft and unpublished vehicles return 404 on public route", async () => {
  const draft = await database.models.Vehicle.create({
    make: "Secret",
    model: "Prototype",
    status: "draft",
    createdBy: ADMIN_ID,
  });

  const unpublished = await database.models.Vehicle.create({
    make: "Archived",
    model: "Legacy",
    status: "unpublished",
    createdBy: ADMIN_ID,
  });

  const draftRes = await fetch(`${baseUrl}/api/v1/vehicles/${draft._id.toString()}`);
  assert.equal(draftRes.status, 404);

  const unpubRes = await fetch(`${baseUrl}/api/v1/vehicles/${unpublished._id.toString()}`);
  assert.equal(unpubRes.status, 404);
});

// Malformed ID returns safe 400 without leaking cast errors
test("malformed vehicle ID returns safe 400 INVALID_IDENTIFIER", async () => {
  const malformedPublicRes = await fetch(`${baseUrl}/api/v1/vehicles/not-a-valid-id`);
  assert.equal(malformedPublicRes.status, 400);
  const pubJson = await malformedPublicRes.json();
  assert.equal(pubJson.error.code, "INVALID_IDENTIFIER");

  const malformedAdminRes = await fetch(`${baseUrl}/api/v1/admin/vehicles/not-a-valid-id`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ variant: "Top" }),
  });
  assert.equal(malformedAdminRes.status, 400);
  const adminJson = await malformedAdminRes.json();
  assert.equal(adminJson.error.code, "INVALID_IDENTIFIER");
});

test("ADM-08: admin can authenticate via access_token and __Host-access_token cookie", async () => {
  // Test access_token cookie
  const cookieRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    headers: {
      Cookie: `access_token=${adminToken}`,
    },
  });
  assert.equal(cookieRes.status, 200);
  const cookieJson = await cookieRes.json();
  assert.ok(Array.isArray(cookieJson.items));

  // Test __Host-access_token cookie
  const hostCookieRes = await fetch(`${baseUrl}/api/v1/admin/vehicles`, {
    headers: {
      Cookie: `__Host-access_token=${adminToken}`,
    },
  });
  assert.equal(hostCookieRes.status, 200);
});
