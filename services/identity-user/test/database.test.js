import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createDatabase } from "../src/database.js";
import { createLogger, loadServiceConfig, ConfigurationError } from "../src/foundation.js";
import { DEFAULT_PORT, SERVICE_NAME } from "../src/app.js";

test("identity database connects, creates unique email index, and enforces normalization", async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 },
  });
  const uri = `${mongod.getUri()}vehicle_identity`;
  const logs = [];
  const logger = createLogger(SERVICE_NAME, (line) => logs.push(line));
  const database = createDatabase({ logger });

  try {
    const connected = await database.connect(uri);
    assert.equal(connected, true);
    assert.equal(database.isReady(), true);

    const { User } = database.models;
    assert.ok(User, "User model should be registered");

    const indexes = await User.collection.indexes();
    const emailIndex = indexes.find((idx) => idx.name === "email_1");
    assert.ok(emailIndex, "Index on email_1 should exist");
    assert.equal(emailIndex.unique, true, "email_1 index must be unique");

    // Create user with uppercase email and verify lowercase normalization
    const user1 = await User.create({
      email: "Buyer.One@Example.Test",
      passwordHash: "sample-argon2id-hash-value-1234",
      role: "user",
    });
    assert.equal(user1.email, "buyer.one@example.test");
    assert.equal(user1.role, "user");

    // Attempt to register duplicate with different case
    await assert.rejects(
      async () => {
        await User.create({
          email: "BUYER.ONE@example.test",
          passwordHash: "sample-argon2id-hash-value-5678",
          role: "user",
        });
      },
      (error) => error.code === 11000,
      "Duplicate email registration must fail with unique index constraint",
    );
  } finally {
    await database.close();
    assert.equal(database.isReady(), false);
    await mongod.stop();
  }
});

test("identity User model enforces strict schema and validation constraints", async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 },
  });
  const uri = `${mongod.getUri()}vehicle_identity`;
  const database = createDatabase({ logger: createLogger(SERVICE_NAME, () => {}) });

  try {
    await database.connect(uri);
    const { User } = database.models;

    // Missing email
    await assert.rejects(
      async () => {
        await User.create({ passwordHash: "sample-hash" });
      },
      /email.*Path `email` is required/i,
    );

    // Invalid email syntax
    await assert.rejects(
      async () => {
        await User.create({ email: "invalid-email-syntax", passwordHash: "sample-hash" });
      },
      /Path `email` is invalid/i,
    );

    // Missing passwordHash
    await assert.rejects(
      async () => {
        await User.create({ email: "valid@example.test" });
      },
      /passwordHash.*Path `passwordHash` is required/i,
    );

    // Invalid role enum
    await assert.rejects(
      async () => {
        await User.create({
          email: "valid@example.test",
          passwordHash: "sample-hash",
          role: "superadmin",
        });
      },
      /`superadmin` is not a valid enum value for path `role`/i,
    );

    // Strict mode rejection of unknown fields
    await assert.rejects(
      async () => {
        await User.create({
          email: "valid@example.test",
          passwordHash: "sample-hash",
          unrecognizedField: "malicious_input",
        });
      },
      /Field `unrecognizedField` is not in schema/i,
    );
  } finally {
    await database.close();
    await mongod.stop();
  }
});

test("identity database handles connection failure gracefully", async () => {
  const logs = [];
  const logger = createLogger(SERVICE_NAME, (line) => logs.push(line));
  const database = createDatabase({ logger });

  // Missing URI returns false and warns
  const noUri = await database.connect("");
  assert.equal(noUri, false);
  assert.equal(database.isReady(), false);

  // Unavailable host returns false and logs error safely
  const failed = await database.connect("mongodb://127.0.0.1:1/vehicle_identity");
  assert.equal(failed, false);
  assert.equal(database.isReady(), false);

  const errorLog = logs.find((line) => line.includes("database.initialization.failed"));
  assert.ok(errorLog, "Safe initialization failure log should be emitted");
  assert.equal(errorLog.includes("password"), false);
});

test("identity service rejects connection URI targeting other service databases", () => {
  assert.throws(
    () => {
      loadServiceConfig(SERVICE_NAME, DEFAULT_PORT, {
        MONGODB_URI: "mongodb://127.0.0.1:27017/vehicle_catalog",
      });
    },
    (error) => error instanceof ConfigurationError && error.message.includes("vehicle_identity"),
  );

  assert.throws(
    () => {
      loadServiceConfig(SERVICE_NAME, DEFAULT_PORT, {
        MONGODB_URI: "mongodb://127.0.0.1:27017/vehicle_recommendations",
      });
    },
    (error) => error instanceof ConfigurationError && error.message.includes("vehicle_identity"),
  );
});
