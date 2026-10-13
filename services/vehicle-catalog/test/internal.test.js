import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp, SERVICE_NAME } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { createLogger } from "../src/foundation.js";

let mongod;
let database;
let server;
let baseUrl;

const TEST_SERVICE_SECRET = "test-internal-catalog-secret";
const ADMIN_ID = "665000000000000000000001";

before(async () => {
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
  if (database?.models?.Vehicle) {
    await database.models.Vehicle.deleteMany({});
  }
});

// ERR-03: Internal route authentication enforcement
test("ERR-03: internal route rejects callers without service identity or with invalid identity", async () => {
  // 1. Without service key
  const noKeyRes = await fetch(`${baseUrl}/internal/v1/vehicles/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(noKeyRes.status, 401);
  const noKeyJson = await noKeyRes.json();
  assert.equal(noKeyJson.error.code, "UNAUTHORIZED");

  // 2. With invalid service key
  const badKeyRes = await fetch(`${baseUrl}/internal/v1/vehicles/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": "wrong-secret",
    },
    body: JSON.stringify({}),
  });
  assert.equal(badKeyRes.status, 403);
  const badKeyJson = await badKeyRes.json();
  assert.equal(badKeyJson.error.code, "FORBIDDEN");
});

test("POST /internal/v1/vehicles/search filters candidates and enforces bounds", async () => {
  const Vehicle = database.models.Vehicle;

  // Seed published and draft vehicles
  await Vehicle.create([
    {
      make: "Tata",
      model: "Harrier",
      bodyType: "suv",
      fuelType: "diesel",
      transmission: "manual",
      seatingCapacity: 5,
      status: "published",
      prices: [
        {
          type: "ex_showroom",
          amount: mongoose.Types.Decimal128.fromString("1500000"),
          currency: "INR",
        },
      ],
      createdBy: ADMIN_ID,
    },
    {
      make: "Tata",
      model: "Safari",
      bodyType: "suv",
      fuelType: "diesel",
      transmission: "automatic",
      seatingCapacity: 7,
      status: "published",
      prices: [
        {
          type: "ex_showroom",
          amount: mongoose.Types.Decimal128.fromString("2200000"),
          currency: "INR",
        },
      ],
      createdBy: ADMIN_ID,
    },
    {
      make: "Tata",
      model: "Curvv EV",
      bodyType: "suv",
      fuelType: "electric",
      status: "draft", // Draft! Should NOT appear
      createdBy: ADMIN_ID,
    },
  ]);

  // Search with bodyType suv and minimumSeats 6 -> matches only Safari
  const res = await fetch(`${baseUrl}/internal/v1/vehicles/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": TEST_SERVICE_SECRET,
    },
    body: JSON.stringify({
      vehicleTypes: ["suv"],
      minimumSeats: 6,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.pagination.totalItems, 1);
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].model, "Safari");

  // Invalid budget bounds (min > max)
  const badBudgetRes = await fetch(`${baseUrl}/internal/v1/vehicles/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": TEST_SERVICE_SECRET,
    },
    body: JSON.stringify({
      budget: { min: 2000000, max: 1000000, priceType: "ex_showroom", currency: "INR" },
    }),
  });
  assert.equal(badBudgetRes.status, 400);
});

test("POST /internal/v1/vehicles/lookup returns published vehicles and unavailable IDs safely", async () => {
  const Vehicle = database.models.Vehicle;

  const published = await Vehicle.create({
    make: "Maruti",
    model: "Baleno",
    status: "published",
    createdBy: ADMIN_ID,
    prices: [
      {
        type: "ex_showroom",
        amount: mongoose.Types.Decimal128.fromString("700000"),
        currency: "INR",
      },
    ],
  });

  const draft = await Vehicle.create({
    make: "Maruti",
    model: "Fronx",
    status: "draft",
    createdBy: ADMIN_ID,
  });

  const unknownId = "665000000000000000000888";

  const res = await fetch(`${baseUrl}/internal/v1/vehicles/lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": TEST_SERVICE_SECRET,
    },
    body: JSON.stringify({
      vehicleIds: [
        published._id.toString(),
        draft._id.toString(),
        unknownId,
      ],
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.vehicles.length, 1);
  assert.equal(data.vehicles[0].id, published._id.toString());
  assert.equal(data.vehicles[0].model, "Baleno");

  // Draft and unknown IDs are reported in unavailableIds without leaking draft data
  assert.equal(data.unavailableIds.length, 2);
  assert.ok(data.unavailableIds.includes(draft._id.toString()));
  assert.ok(data.unavailableIds.includes(unknownId));
});
