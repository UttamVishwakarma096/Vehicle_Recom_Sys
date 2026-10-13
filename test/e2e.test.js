import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";

// Identity Service imports
import { createApp as createIdentityApp } from "../services/identity-user/src/app.js";
import { createDatabase as createIdentityDatabase } from "../services/identity-user/src/database.js";
import { createLogger as createIdentityLogger } from "../services/identity-user/src/foundation.js";
import { TokenService } from "../services/identity-user/src/auth/jwt.js";
import { SessionService } from "../services/identity-user/src/auth/sessions.js";

// Catalog Service imports
import { createApp as createCatalogApp } from "../services/vehicle-catalog/src/app.js";
import { createDatabase as createCatalogDatabase } from "../services/vehicle-catalog/src/database.js";
import { createLogger as createCatalogLogger } from "../services/vehicle-catalog/src/foundation.js";
import { TokenVerifier as CatalogTokenVerifier } from "../services/vehicle-catalog/src/auth/jwt.js";

// Recommendation Service imports
import { createApp as createRecommendationApp } from "../services/recommendation/src/app.js";
import { createDatabase as createRecommendationDatabase } from "../services/recommendation/src/database.js";
import { createLogger as createRecommendationLogger } from "../services/recommendation/src/foundation.js";
import { TokenVerifier as RecTokenVerifier } from "../services/recommendation/src/auth/jwt.js";
import { CatalogClient } from "../services/recommendation/src/clients/catalogClient.js";
import { IdentityClient } from "../services/recommendation/src/clients/identityClient.js";

let mongod;
const servers = {};
const databases = {};
const urls = {};
let tokenService;
const INTERNAL_SECRET = "e2e-shared-service-secret-key-9988";

function extractCookies(response) {
  const list = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  if (list.length > 0) {
    return list.map((c) => c.split(";")[0].trim()).join("; ");
  }
  const raw = response.headers.get("set-cookie") || "";
  return raw.split(";")[0].trim();
}

function extractAccessToken(response) {
  const list = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  for (const c of list) {
    if (c.startsWith("access_token=")) {
      return c.split(";")[0].replace("access_token=", "").trim();
    }
  }
  const raw = response.headers.get("set-cookie") || "";
  const match = raw.match(/access_token=([^;]+)/);
  return match ? match[1] : null;
}

before(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 },
  });

  const baseMongoUri = mongod.getUri();

  // 1. Identity Service Setup
  const idLogger = createIdentityLogger("e2e-identity", () => {});
  databases.identity = createIdentityDatabase({ logger: idLogger });
  await databases.identity.connect(`${baseMongoUri}e2e_identity_db`);

  tokenService = new TokenService();
  const sessionService = new SessionService({
    getSessionModel: () => databases.identity.models.Session,
  });

  const identityApp = createIdentityApp({
    logger: idLogger,
    isReady: databases.identity.isReady,
    models: databases.identity.models,
    tokenService,
    sessionService,
    internalSecret: INTERNAL_SECRET,
  });

  servers.identity = identityApp.listen(0, "127.0.0.1");
  await new Promise((resolve) => servers.identity.once("listening", resolve));
  urls.identity = `http://127.0.0.1:${servers.identity.address().port}`;

  // 2. Catalog Service Setup
  const catLogger = createCatalogLogger("e2e-catalog", () => {});
  databases.catalog = createCatalogDatabase({ logger: catLogger });
  await databases.catalog.connect(`${baseMongoUri}e2e_catalog_db`);

  const catalogTokenVerifier = new CatalogTokenVerifier({
    publicKey: tokenService.publicKey,
  });

  const catalogApp = createCatalogApp({
    logger: catLogger,
    isReady: databases.catalog.isReady,
    models: databases.catalog.models,
    tokenVerifier: catalogTokenVerifier,
    internalSecret: INTERNAL_SECRET,
  });

  servers.catalog = catalogApp.listen(0, "127.0.0.1");
  await new Promise((resolve) => servers.catalog.once("listening", resolve));
  urls.catalog = `http://127.0.0.1:${servers.catalog.address().port}`;

  // 3. Recommendation Service Setup
  const recLogger = createRecommendationLogger("e2e-recommendation", () => {});
  databases.recommendation = createRecommendationDatabase({ logger: recLogger });
  await databases.recommendation.connect(`${baseMongoUri}e2e_recommendation_db`);

  const recTokenVerifier = new RecTokenVerifier({
    publicKey: tokenService.publicKey,
  });

  const catalogClient = new CatalogClient({
    baseUrl: urls.catalog,
    serviceKey: INTERNAL_SECRET,
  });

  const identityClient = new IdentityClient({
    baseUrl: urls.identity,
    serviceKey: INTERNAL_SECRET,
  });

  const recommendationApp = createRecommendationApp({
    logger: recLogger,
    isReady: databases.recommendation.isReady,
    models: databases.recommendation.models,
    tokenVerifier: recTokenVerifier,
    catalogClient,
    identityClient,
  });

  servers.recommendation = recommendationApp.listen(0, "127.0.0.1");
  await new Promise((resolve) => servers.recommendation.once("listening", resolve));
  urls.recommendation = `http://127.0.0.1:${servers.recommendation.address().port}`;
});

after(async () => {
  for (const s of Object.values(servers)) {
    if (s) await new Promise((resolve) => s.close(resolve));
  }
  for (const db of Object.values(databases)) {
    if (db) await db.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});

test("E2E-01: Cross-service discovery and comparison journey", async () => {
  const adminToken = tokenService.signAccessToken({
    id: "665000000000000000000099",
    email: "admin@e2e.test",
    role: "admin",
  });

  const vehicleAData = {
    make: "Tata",
    model: "Nexon EV",
    variant: "Empowered",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "electric",
    transmission: "automatic",
    seatingCapacity: 5,
    prices: [
      { type: "ex_showroom", amount: 1500000, currency: "INR" },
      { type: "on_road", amount: 1650000, currency: "INR" },
    ],
    specifications: {
      power: { value: 142, unit: "hp", verified: true },
    },
    dataSources: [
      {
        provider: "Tata Motors Press Kit",
        retrievedAt: new Date().toISOString(),
      },
    ],
  };

  const createARes = await fetch(`${urls.catalog}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(vehicleAData),
  });
  assert.equal(createARes.status, 201);
  const vehicleA = await createARes.json();

  // Publish vehicle A
  const pubARes = await fetch(`${urls.catalog}/api/v1/admin/vehicles/${vehicleA.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "published" }),
  });
  assert.equal(pubARes.status, 200);

  const vehicleBData = {
    make: "Mahindra",
    model: "XUV400",
    variant: "EL Pro",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "electric",
    transmission: "automatic",
    seatingCapacity: 5,
    prices: [
      { type: "ex_showroom", amount: 1550000, currency: "INR" },
      { type: "on_road", amount: 1700000, currency: "INR" },
    ],
    specifications: {
      power: { value: 150, unit: "hp", verified: true },
    },
    dataSources: [
      {
        provider: "Mahindra Press Release 2024",
        retrievedAt: new Date().toISOString(),
      },
    ],
  };

  const createBRes = await fetch(`${urls.catalog}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(vehicleBData),
  });
  assert.equal(createBRes.status, 201);
  const vehicleB = await createBRes.json();

  const pubBRes = await fetch(`${urls.catalog}/api/v1/admin/vehicles/${vehicleB.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "published" }),
  });
  assert.equal(pubBRes.status, 200);

  // 1. Anonymous visitor searches catalog
  const searchRes = await fetch(
    `${urls.catalog}/api/v1/vehicles?fuelType=electric&bodyType=suv&sortBy=price&sortOrder=asc&priceType=ex_showroom`,
  );
  assert.equal(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert.equal(searchData.items.length, 2);
  assert.equal(searchData.items[0].id, vehicleA.id);
  assert.equal(searchData.items[1].id, vehicleB.id);

  // 2. Anonymous visitor requests comparison in Recommendation service -> 401
  const unauthCompareRes = await fetch(`${urls.recommendation}/api/v1/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicleIds: [vehicleA.id, vehicleB.id],
    }),
  });
  assert.equal(unauthCompareRes.status, 401);

  // 3. Authenticated user requests comparison in Recommendation service -> 200
  const userToken = tokenService.signAccessToken({
    id: "user-e2e-compare-id",
    email: "driver-compare@example.com",
    role: "user",
  });
  const compareRes = await fetch(`${urls.recommendation}/api/v1/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      vehicleIds: [vehicleA.id, vehicleB.id],
    }),
  });
  assert.equal(compareRes.status, 200);
  const compareData = await compareRes.json();
  assert.equal(compareData.vehicles.length, 2);
  assert.equal(compareData.vehicles[0].make, "Tata");
  assert.equal(compareData.vehicles[1].make, "Mahindra");
  assert.ok(Array.isArray(compareData.comparison));
  assert.ok(compareData.comparison.length > 0);
});

test("E2E-02: Preference questionnaire recommendation journey with honest evidence", async () => {
  const questPayload = {
    preferences: {
      budget: { min: 1000000, max: 2000000, priceType: "ex_showroom", currency: "INR" },
      vehicleTypes: ["suv"],
      fuelTypes: ["electric"],
      transmissions: ["automatic"],
      minimumSeats: 5,
      drivingEnvironment: "city",
      annualDistanceKm: 15000,
      priorities: {
        fuelEfficiency: 5,
        performance: 4,
        safety: 4,
        reliability: 4,
        maintenanceCost: 3,
      },
    },
  };

  // 1. Unauthenticated visitor is rejected with 401
  const unauthRes = await fetch(`${urls.recommendation}/api/v1/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(questPayload),
  });
  assert.equal(unauthRes.status, 401);

  // 2. Authenticated user submits questionnaire requesting electric SUVs
  const userToken = tokenService.signAccessToken({
    id: "user-e2e-questionnaire-id",
    email: "driver-quest@example.com",
    role: "user",
  });

  const recRes = await fetch(`${urls.recommendation}/api/v1/recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify(questPayload),
  });

  assert.equal(recRes.status, 200);
  const recData = await recRes.json();
  assert.ok(recData.items.length >= 2);
  assert.ok(recData.items[0].matchScore >= 0 && recData.items[0].matchScore <= 100);
  assert.ok(Array.isArray(recData.items[0].reasons));
  assert.ok(Array.isArray(recData.items[0].tradeoffs));
  assert.ok(recData.scoreDisclaimer.includes("Preference match"));
});

test("E2E-03: User registration, saved preferences, favorites, and isolation lifecycle", async () => {
  // 1. User A registers
  const regARes = await fetch(`${urls.identity}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "usera@e2e.test",
      password: "StrongPassword123!",
      displayName: "User Alice",
    }),
  });
  assert.equal(regARes.status, 201);
  const userA = await regARes.json();
  assert.equal(userA.user.email, "usera@e2e.test");
  assert.equal(userA.user.passwordHash, undefined); // Password hash never exposed

  // 2. User A logs in and retrieves cookies + tokens
  const loginARes = await fetch(`${urls.identity}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "usera@e2e.test",
      password: "StrongPassword123!",
    }),
  });
  assert.equal(loginARes.status, 200);
  const loginAData = await loginARes.json();
  const tokenA = extractAccessToken(loginARes);
  const cookieA = extractCookies(loginARes);

  // 3. User A saves profile preferences
  const updatePrefRes = await fetch(`${urls.identity}/api/v1/users/me/preferences`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
      Cookie: cookieA,
      "X-CSRF-Token": loginAData.csrfToken,
    },
    body: JSON.stringify({
      budget: { min: 1200000, max: 1800000, priceType: "ex_showroom" },
      vehicleTypes: ["suv"],
      fuelTypes: ["electric"],
      transmissions: ["automatic"],
      minimumSeats: 5,
      drivingEnvironment: "city",
      annualDistanceKm: 15000,
      priorities: {
        fuelEfficiency: 5,
        performance: 4,
        safety: 4,
        reliability: 4,
        maintenanceCost: 3,
      },
    }),
  });
  assert.equal(updatePrefRes.status, 200);

  // 4. User A requests recommendation using saved preferences (cross-service call)
  const savedRecRes = await fetch(`${urls.recommendation}/api/v1/recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ useSavedPreferences: true }),
  });
  assert.equal(savedRecRes.status, 200);
  const savedRecData = await savedRecRes.json();
  assert.ok(savedRecData.items.length >= 1);

  // 5. User A adds vehicle to favorites in Recommendation service
  const vehicleIdToFav = savedRecData.items[0].vehicle.id;
  const addFavRes = await fetch(
    `${urls.recommendation}/api/v1/favorites/${vehicleIdToFav}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    },
  );
  assert.equal(addFavRes.status, 201);

  // 6. User A lists favorites
  const listFavRes = await fetch(`${urls.recommendation}/api/v1/favorites`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(listFavRes.status, 200);
  const listFavData = await listFavRes.json();
  assert.equal(listFavData.items.length, 1);
  assert.equal(listFavData.items[0].vehicleId, vehicleIdToFav);

  // 7. Security: User B registers and cannot delete User A's favorite
  const regBRes = await fetch(`${urls.identity}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "userb@e2e.test",
      password: "StrongPassword123!",
      displayName: "User Bob",
    }),
  });
  assert.equal(regBRes.status, 201);
  const loginBRes = await fetch(`${urls.identity}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "userb@e2e.test",
      password: "StrongPassword123!",
    }),
  });
  const tokenB = extractAccessToken(loginBRes);

  // User B lists favorites - empty!
  const listBRes = await fetch(`${urls.recommendation}/api/v1/favorites`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(listBRes.status, 200);
  assert.equal((await listBRes.json()).items.length, 0);

  // User B attempts to delete User A's favorite -> 204 (idempotent, affects only User B's scope)
  const delBRes = await fetch(`${urls.recommendation}/api/v1/favorites/${vehicleIdToFav}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(delBRes.status, 204);

  // User A still has their favorite intact!
  const listAStillThereRes = await fetch(`${urls.recommendation}/api/v1/favorites`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(listAStillThereRes.status, 200);
  assert.equal((await listAStillThereRes.json()).items.length, 1);

  // 8. User A deletes favorite successfully -> 204
  const delARes = await fetch(`${urls.recommendation}/api/v1/favorites/${vehicleIdToFav}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(delARes.status, 204);

  // 9. User A logs out
  const logoutRes = await fetch(`${urls.identity}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenA}`,
      Cookie: cookieA,
      "X-CSRF-Token": loginAData.csrfToken,
    },
  });
  assert.equal(logoutRes.status, 204);
});

test("E2E-04: Admin draft creation, publication preconditions, and draft isolation", async () => {
  const adminToken = tokenService.signAccessToken({
    id: "665000000000000000000099",
    email: "admin@e2e.test",
    role: "admin",
  });

  const regularUserToken = tokenService.signAccessToken({
    id: "665000000000000000000088",
    email: "regular@e2e.test",
    role: "user",
  });

  // 1. Regular user rejected with 403 when creating vehicle
  const unauthRes = await fetch(`${urls.catalog}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${regularUserToken}`,
    },
    body: JSON.stringify({ make: "Unauthorized", model: "Vehicle" }),
  });
  assert.equal(unauthRes.status, 403);

  // 2. Admin creates draft vehicle without provenance
  const draftRes = await fetch(`${urls.catalog}/api/v1/admin/vehicles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      make: "Hyundai",
      model: "Ioniq 5",
      variant: "Long Range",
      modelYear: 2024,
      bodyType: "suv",
      fuelType: "electric",
      transmission: "automatic",
      seatingCapacity: 5,
      prices: [
        { type: "ex_showroom", amount: 4600000, currency: "INR" },
      ],
    }),
  });
  assert.equal(draftRes.status, 201);
  const draftVehicle = await draftRes.json();
  assert.equal(draftVehicle.status, "draft");

  // 3. Draft isolation: Visitor cannot see draft in public catalog
  const publicRes = await fetch(`${urls.catalog}/api/v1/vehicles/${draftVehicle.id}`);
  assert.equal(publicRes.status, 404);

  // 4. Admin tries to publish draft without provenance -> Rejected with 409
  const pubFailRes = await fetch(
    `${urls.catalog}/api/v1/admin/vehicles/${draftVehicle.id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "published" }),
    },
  );
  assert.equal(pubFailRes.status, 409);

  // 5. Admin updates vehicle with verified dataSources
  const updateRes = await fetch(
    `${urls.catalog}/api/v1/admin/vehicles/${draftVehicle.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dataSources: [
          {
            provider: "Hyundai Motor India Press Release 2024",
            sourceUrl: "https://hyundai.com/press",
            retrievedAt: new Date().toISOString(),
          },
        ],
      }),
    },
  );
  assert.equal(updateRes.status, 200);

  // 6. Admin publishes now-valid vehicle
  const pubSuccessRes = await fetch(
    `${urls.catalog}/api/v1/admin/vehicles/${draftVehicle.id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "published" }),
    },
  );
  assert.equal(pubSuccessRes.status, 200);

  // 7. Visitor can now access published vehicle
  const publicOkRes = await fetch(`${urls.catalog}/api/v1/vehicles/${draftVehicle.id}`);
  assert.equal(publicOkRes.status, 200);
  const publishedVehicle = await publicOkRes.json();
  assert.equal(publishedVehicle.model, "Ioniq 5");
  assert.equal(publishedVehicle.status, "published");
});

test("ML-01 & SEC-03: Longevity feature gate and internal service authentication", async () => {
  // Longevity gate returns 503 FEATURE_NOT_ENABLED
  const lonRes = await fetch(`${urls.recommendation}/api/v1/longevity/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId: "666000000000000000000001" }),
  });
  assert.equal(lonRes.status, 503);
  const lonData = await lonRes.json();
  assert.equal(lonData.error.code, "FEATURE_NOT_ENABLED");

  // Internal endpoints reject callers without service secret
  const unauthInternalRes = await fetch(
    `${urls.catalog}/internal/v1/vehicles/search`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  assert.equal(unauthInternalRes.status, 401);

  // Internal endpoints reject callers with incorrect service secret
  const badSecretRes = await fetch(
    `${urls.catalog}/internal/v1/vehicles/search`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Service-Key": "wrong-secret-token",
      },
      body: JSON.stringify({}),
    },
  );
  assert.equal(badSecretRes.status, 403);
});
