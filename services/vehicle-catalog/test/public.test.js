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

// Seed helper for tests
async function seedCatalog() {
  const Vehicle = database.models.Vehicle;

  // 1. Published Tata Nexon
  const nexon = await Vehicle.create({
    make: "Tata",
    model: "Nexon",
    modelYear: 2024,
    variant: "Creative Plus",
    imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
    bodyType: "suv",
    fuelType: "petrol",
    transmission: "manual",
    seatingCapacity: 5,
    status: "published",
    prices: [
      {
        type: "ex_showroom",
        amount: mongoose.Types.Decimal128.fromString("950000"),
        currency: "INR",
      },
      {
        type: "on_road",
        amount: mongoose.Types.Decimal128.fromString("1100000"),
        currency: "INR",
      },
    ],
    dataSources: [
      {
        provider: "Tata Motors Official",
        retrievedAt: new Date(),
        licenseReference: "Public Catalog Data",
      },
    ],
    createdBy: ADMIN_ID,
  });

  // 2. Published Hyundai Creta
  const creta = await Vehicle.create({
    make: "Hyundai",
    model: "Creta",
    modelYear: 2024,
    variant: "SX",
    bodyType: "suv",
    fuelType: "diesel",
    transmission: "automatic",
    seatingCapacity: 5,
    status: "published",
    prices: [
      {
        type: "ex_showroom",
        amount: mongoose.Types.Decimal128.fromString("1600000"),
        currency: "INR",
      },
      {
        type: "on_road",
        amount: mongoose.Types.Decimal128.fromString("1850000"),
        currency: "INR",
      },
    ],
    dataSources: [
      {
        provider: "Hyundai Official",
        retrievedAt: new Date(),
      },
    ],
    createdBy: ADMIN_ID,
  });

  // 3. Published Maruti Suzuki Swift
  const swift = await Vehicle.create({
    make: "Maruti",
    model: "Swift",
    modelYear: 2024,
    variant: "VXi",
    bodyType: "hatchback",
    fuelType: "petrol",
    transmission: "manual",
    seatingCapacity: 5,
    status: "published",
    prices: [
      {
        type: "ex_showroom",
        amount: mongoose.Types.Decimal128.fromString("650000"),
        currency: "INR",
      },
      {
        type: "used",
        amount: mongoose.Types.Decimal128.fromString("500000"),
        currency: "INR",
      },
    ],
    dataSources: [
      {
        provider: "Maruti Official",
        retrievedAt: new Date(),
      },
    ],
    createdBy: ADMIN_ID,
  });

  // 4. Draft vehicle (should NOT be visible to public)
  const draft = await Vehicle.create({
    make: "Mahindra",
    model: "Thar Roxx",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "diesel",
    transmission: "automatic",
    status: "draft",
    createdBy: ADMIN_ID,
  });

  // 5. Unpublished vehicle (should NOT be visible to public)
  const unpublished = await Vehicle.create({
    make: "Honda",
    model: "Amaze",
    status: "unpublished",
    createdBy: ADMIN_ID,
  });

  return { nexon, creta, swift, draft, unpublished };
}

// CAT-01: FR-CAT-01 - List vehicles -> Only published records returned; response is paginated
test("CAT-01: public vehicle listing returns only published records and paginates", async () => {
  await seedCatalog();

  const response = await fetch(`${baseUrl}/api/v1/vehicles`);
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.equal(data.pagination.totalItems, 3); // 3 published, 2 draft/unpublished excluded
  assert.equal(data.items.length, 3);
  assert.ok(data.items.every((v) => v.status === "published"));

  // Check pagination structure
  assert.equal(data.pagination.page, 1);
  assert.equal(data.pagination.limit, 20);
  assert.equal(data.pagination.totalPages, 1);
});

// CAT-02: FR-CAT-02 - Fetch valid ID -> Supported fields, price type, provenance, and missing values represented
test("CAT-02: public vehicle details returns full valid projection with missing values preserved", async () => {
  const { nexon } = await seedCatalog();

  const response = await fetch(`${baseUrl}/api/v1/vehicles/${nexon._id.toString()}`);
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.equal(data.id, nexon._id.toString());
  assert.equal(data.make, "Tata");
  assert.equal(data.model, "Nexon");
  assert.equal(data.variant, "Creative Plus");
  assert.equal(data.imageUrl, "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80");
  assert.deepEqual(data.images, [
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
  ]);
  assert.equal(data.status, "published");

  // Prices projection
  assert.equal(data.prices.length, 2);
  const exShowroom = data.prices.find((p) => p.type === "ex_showroom");
  assert.ok(exShowroom);
  assert.equal(exShowroom.amount, 950000);
  assert.equal(exShowroom.currency, "INR");

  // Provenance projection
  assert.equal(data.dataSources.length, 1);
  assert.equal(data.dataSources[0].provider, "Tata Motors Official");
  assert.equal(data.dataSources[0].licenseReference, "Public Catalog Data");

  // Missing values should not be invented
  assert.equal(data.specifications, undefined);
});

// CAT-03: FR-CAT-02 - Malformed ID gets 400; unknown/unpublished ID gets safe 404
test("CAT-03: malformed ID returns 400; unknown and unpublished ID returns safe 404", async () => {
  const { unpublished } = await seedCatalog();

  // Malformed ID
  const malformedRes = await fetch(`${baseUrl}/api/v1/vehicles/invalid-hex-id`);
  assert.equal(malformedRes.status, 400);
  const malformedJson = await malformedRes.json();
  assert.equal(malformedJson.error.code, "INVALID_IDENTIFIER");

  // Well-formed but non-existent ObjectId
  const unknownRes = await fetch(`${baseUrl}/api/v1/vehicles/665000000000000000000999`);
  assert.equal(unknownRes.status, 404);
  const unknownJson = await unknownRes.json();
  assert.equal(unknownJson.error.code, "NOT_FOUND");

  // Well-formed unpublished vehicle ID -> must return 404 on public route
  const unpublishedRes = await fetch(`${baseUrl}/api/v1/vehicles/${unpublished._id.toString()}`);
  assert.equal(unpublishedRes.status, 404);
});

// SRCH-01: FR-SEARCH-01 - Search by q, make, type, fuel, transmission, seats -> Only expected records match
test("SRCH-01: search and filter dimensions combine with AND", async () => {
  await seedCatalog();

  // Search by text 'creta'
  const qRes = await fetch(`${baseUrl}/api/v1/vehicles?q=creta`);
  assert.equal(qRes.status, 200);
  const qData = await qRes.json();
  assert.equal(qData.items.length, 1);
  assert.equal(qData.items[0].model, "Creta");

  // Filter by bodyType=suv and fuelType=diesel
  const filterRes = await fetch(`${baseUrl}/api/v1/vehicles?bodyType=suv&fuelType=diesel`);
  assert.equal(filterRes.status, 200);
  const filterData = await filterRes.json();
  assert.equal(filterData.items.length, 1);
  assert.equal(filterData.items[0].model, "Creta");

  // Filter by transmission=manual and seatingCapacity=5
  const manualRes = await fetch(`${baseUrl}/api/v1/vehicles?transmission=manual&seatingCapacity=5`);
  assert.equal(manualRes.status, 200);
  const manualData = await manualRes.json();
  assert.equal(manualData.items.length, 2); // Nexon and Swift
});

// SRCH-02: FR-SEARCH-01 - Price range and priceType filtering with inclusive bounds
test("SRCH-02: minPrice and maxPrice apply inclusive bounds for requested priceType", async () => {
  await seedCatalog();

  // Ex-showroom between 700000 and 1000000 -> matches Nexon (950000)
  const rangeRes = await fetch(
    `${baseUrl}/api/v1/vehicles?priceType=ex_showroom&minPrice=700000&maxPrice=1000000`,
  );
  assert.equal(rangeRes.status, 200);
  const rangeData = await rangeRes.json();
  assert.equal(rangeData.items.length, 1);
  assert.equal(rangeData.items[0].model, "Nexon");

  // Exact boundary test: minPrice=950000, maxPrice=950000 (inclusive)
  const exactRes = await fetch(
    `${baseUrl}/api/v1/vehicles?priceType=ex_showroom&minPrice=950000&maxPrice=950000`,
  );
  assert.equal(exactRes.status, 200);
  const exactData = await exactRes.json();
  assert.equal(exactData.items.length, 1);
  assert.equal(exactData.items[0].model, "Nexon");

  // Used price filter -> only Swift has used price of 500000
  const usedRes = await fetch(`${baseUrl}/api/v1/vehicles?priceType=used&maxPrice=600000`);
  assert.equal(usedRes.status, 200);
  const usedData = await usedRes.json();
  assert.equal(usedData.items.length, 1);
  assert.equal(usedData.items[0].model, "Swift");
});

// SRCH-03: FR-SEARCH-01 - Valid unmatched filters return 200 with empty list
test("SRCH-03: unmatched search returns 200 OK with empty items and pagination metadata", async () => {
  await seedCatalog();

  const response = await fetch(`${baseUrl}/api/v1/vehicles?make=Lamborghini`);
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.deepEqual(data.items, []);
  assert.equal(data.pagination.totalItems, 0);
  assert.equal(data.pagination.totalPages, 0);
});

// SRCH-04: FR-SEARCH-01 - Operator-shaped strings and invalid enums are rejected or inert
test("SRCH-04: operator injection attempts and invalid enums are safely rejected", async () => {
  await seedCatalog();

  // Invalid enum for bodyType
  const invalidEnumRes = await fetch(`${baseUrl}/api/v1/vehicles?bodyType=invalid-type`);
  assert.equal(invalidEnumRes.status, 400);
  const enumJson = await invalidEnumRes.json();
  assert.equal(enumJson.error.code, "INVALID_QUERY");

  // Reversed price bounds (min > max)
  const reversedPriceRes = await fetch(
    `${baseUrl}/api/v1/vehicles?priceType=ex_showroom&minPrice=1000000&maxPrice=500000`,
  );
  assert.equal(reversedPriceRes.status, 400);

  // Missing required priceType when minPrice is specified
  const missingPriceTypeRes = await fetch(`${baseUrl}/api/v1/vehicles?minPrice=500000`);
  assert.equal(missingPriceTypeRes.status, 400);

  // Unrecognized query parameter
  const extraParamRes = await fetch(`${baseUrl}/api/v1/vehicles?malicious=true`);
  assert.equal(extraParamRes.status, 400);

  // Operator-shaped string search (inert text search)
  const inertRes = await fetch(`${baseUrl}/api/v1/vehicles?q=%7B%22%24gt%22%3A%22%22%7D`);
  assert.equal(inertRes.status, 200);
  const inertData = await inertRes.json();
  assert.deepEqual(inertData.items, []);
});

// SRCH-05: FR-SEARCH-02 - Page boundaries, limit > max, sorting and ties
test("SRCH-05: bounded pagination, limit enforcement, and deterministic sorting", async () => {
  await seedCatalog();

  // Limit > 100 rejected with 400
  const overLimitRes = await fetch(`${baseUrl}/api/v1/vehicles?limit=101`);
  assert.equal(overLimitRes.status, 400);

  // Unsupported sort field rejected with 400
  const badSortRes = await fetch(`${baseUrl}/api/v1/vehicles?sortBy=secretField`);
  assert.equal(badSortRes.status, 400);

  // Sorting by price asc: Swift (650k) -> Nexon (950k) -> Creta (1600k)
  const priceSortRes = await fetch(
    `${baseUrl}/api/v1/vehicles?sortBy=price&sortOrder=asc&priceType=ex_showroom`,
  );
  assert.equal(priceSortRes.status, 200);
  const priceData = await priceSortRes.json();
  assert.equal(priceData.items.length, 3);
  assert.equal(priceData.items[0].model, "Swift");
  assert.equal(priceData.items[1].model, "Nexon");
  assert.equal(priceData.items[2].model, "Creta");

  // Pagination page=1 limit=2
  const p1Res = await fetch(`${baseUrl}/api/v1/vehicles?page=1&limit=2`);
  assert.equal(p1Res.status, 200);
  const p1Data = await p1Res.json();
  assert.equal(p1Data.items.length, 2);
  assert.equal(p1Data.pagination.totalPages, 2);

  // Pagination page=2 limit=2
  const p2Res = await fetch(`${baseUrl}/api/v1/vehicles?page=2&limit=2`);
  assert.equal(p2Res.status, 200);
  const p2Data = await p2Res.json();
  assert.equal(p2Data.items.length, 1);
});
