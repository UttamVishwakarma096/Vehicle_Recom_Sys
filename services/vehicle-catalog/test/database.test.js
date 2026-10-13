import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createDatabase } from "../src/database.js";
import { createLogger } from "../src/foundation.js";

let mongod;
let database;

before(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 },
  });
  const uri = `${mongod.getUri()}vehicle_catalog`;
  const logger = createLogger("vehicle-catalog-test", () => {});
  database = createDatabase({ logger });
  await database.connect(uri);
});

after(async () => {
  if (database) {
    await database.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});

test("database registers Vehicle model and creates compound indexes", async () => {
  assert.equal(database.isReady(), true);
  const Vehicle = database.models.Vehicle;
  assert.ok(Vehicle, "Vehicle model should be registered");

  const indexes = await Vehicle.collection.indexes();

  // Check { status: 1, make: 1, model: 1, modelYear: -1 }
  const hasMakeModelIndex = indexes.some(
    (idx) =>
      idx.key.status === 1 &&
      idx.key.make === 1 &&
      idx.key.model === 1 &&
      idx.key.modelYear === -1,
  );
  assert.ok(hasMakeModelIndex, "Compound index on status, make, model, modelYear must exist");

  // Check { status: 1, bodyType: 1, fuelType: 1, transmission: 1 }
  const hasFilterIndex = indexes.some(
    (idx) =>
      idx.key.status === 1 &&
      idx.key.bodyType === 1 &&
      idx.key.fuelType === 1 &&
      idx.key.transmission === 1,
  );
  assert.ok(hasFilterIndex, "Compound index on status, bodyType, fuelType, transmission must exist");

  // Check { status: 1, 'prices.type': 1, 'prices.amount': 1 }
  const hasPriceIndex = indexes.some(
    (idx) =>
      idx.key.status === 1 &&
      idx.key["prices.type"] === 1 &&
      idx.key["prices.amount"] === 1,
  );
  assert.ok(hasPriceIndex, "Compound index on status, prices.type, prices.amount must exist");
});

test("vehicle model enforces schema validation rules", async () => {
  const Vehicle = database.models.Vehicle;

  // Missing make and model
  const emptyVehicle = new Vehicle({ createdBy: "admin-1" });
  await assert.rejects(
    async () => emptyVehicle.validate(),
    /Path `make` is required/,
  );

  // Negative price amount
  const invalidPriceVehicle = new Vehicle({
    make: "TestMake",
    model: "TestModel",
    createdBy: "admin-1",
    prices: [
      {
        type: "ex_showroom",
        amount: mongoose.Types.Decimal128.fromString("-100"),
        currency: "INR",
      },
    ],
  });
  await assert.rejects(
    async () => invalidPriceVehicle.validate(),
    /Price amount must be greater than zero/,
  );

  // Non-INR currency
  const invalidCurrencyVehicle = new Vehicle({
    make: "TestMake",
    model: "TestModel",
    createdBy: "admin-1",
    prices: [
      {
        type: "ex_showroom",
        amount: mongoose.Types.Decimal128.fromString("500000"),
        currency: "USD",
      },
    ],
  });
  await assert.rejects(
    async () => invalidCurrencyVehicle.validate(),
    /`USD` is not a valid enum value/,
  );

  // Invalid body type
  const invalidBodyVehicle = new Vehicle({
    make: "TestMake",
    model: "TestModel",
    bodyType: "spaceship",
    createdBy: "admin-1",
  });
  await assert.rejects(
    async () => invalidBodyVehicle.validate(),
    /`spaceship` is not a valid enum value/,
  );

  // Valid vehicle saves cleanly
  const validVehicle = new Vehicle({
    make: "Tata",
    model: "Nexon",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "petrol",
    transmission: "manual",
    seatingCapacity: 5,
    status: "draft",
    prices: [
      {
        type: "ex_showroom",
        amount: mongoose.Types.Decimal128.fromString("800000"),
        currency: "INR",
      },
    ],
    createdBy: "admin-1",
  });
  const saved = await validVehicle.save();
  assert.ok(saved._id);
  assert.equal(saved.status, "draft");
});
