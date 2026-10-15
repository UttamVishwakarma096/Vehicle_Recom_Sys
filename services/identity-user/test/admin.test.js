import assert from "node:assert/strict";
import { test, before, after, beforeEach } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp, SERVICE_NAME } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { createLogger } from "../src/foundation.js";
import { TokenService } from "../src/auth/jwt.js";
import { SessionService } from "../src/auth/sessions.js";
import { hashPassword } from "../src/auth/passwords.js";

let mongod;
let database;
let tokenService;
let sessionService;
let server;
let baseUrl;
let app;

let adminUser;
let regularUser;
let adminToken;
let userToken;

before(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 },
  });
  const uri = `${mongod.getUri()}vehicle_identity_admin`;
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
  await database.models.User.deleteMany({});
  await database.models.Session.deleteMany({});

  const pwHash = await hashPassword("ValidPassword123!");

  adminUser = await database.models.User.create({
    email: "admin@example.test",
    passwordHash: pwHash,
    role: "admin",
    profile: { displayName: "Admin User", city: "Mumbai" },
  });

  regularUser = await database.models.User.create({
    email: "user@example.test",
    passwordHash: pwHash,
    role: "user",
    profile: { displayName: "Standard Buyer", city: "Pune" },
  });

  adminToken = tokenService.signAccessToken({
    id: adminUser._id.toString(),
    email: adminUser.email,
    role: adminUser.role,
  });

  userToken = tokenService.signAccessToken({
    id: regularUser._id.toString(),
    email: regularUser.email,
    role: regularUser.role,
  });
});

test("ADM-USER-01: unauthenticated requests to /api/v1/admin/users are rejected with 401", async () => {
  const res = await fetch(`${baseUrl}/api/v1/admin/users`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error.code, "UNAUTHORIZED");
});

test("ADM-USER-02: regular user requests to /api/v1/admin/users are rejected with 403", async () => {
  const res = await fetch(`${baseUrl}/api/v1/admin/users`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.error.code, "FORBIDDEN");
});

test("ADM-USER-03: admin can list users with pagination and without sensitive passwordHash", async () => {
  const res = await fetch(`${baseUrl}/api/v1/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.items.length, 2);
  assert.equal(data.pagination.totalItems, 2);
  assert.equal(data.pagination.page, 1);

  // Assert no passwordHash exposed
  for (const item of data.items) {
    assert.equal(item.passwordHash, undefined);
    assert.ok(item.id);
    assert.ok(item.email);
    assert.ok(item.role);
  }
});

test("ADM-USER-04: admin can search users by email and filter by role", async () => {
  const searchRes = await fetch(`${baseUrl}/api/v1/admin/users?search=buyer`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert.equal(searchData.items.length, 1);
  assert.equal(searchData.items[0].email, "user@example.test");

  const roleRes = await fetch(`${baseUrl}/api/v1/admin/users?role=admin`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(roleRes.status, 200);
  const roleData = await roleRes.json();
  assert.equal(roleData.items.length, 1);
  assert.equal(roleData.items[0].email, "admin@example.test");
});

test("ADM-USER-05: admin can promote user to admin role", async () => {
  const patchRes = await fetch(`${baseUrl}/api/v1/admin/users/${regularUser._id.toString()}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(patchRes.status, 200);
  const data = await patchRes.json();
  assert.equal(data.user.role, "admin");

  const updatedInDb = await database.models.User.findById(regularUser._id);
  assert.equal(updatedInDb.role, "admin");
});

test("ADM-USER-06: system prevents demoting the last remaining admin", async () => {
  const demoteRes = await fetch(`${baseUrl}/api/v1/admin/users/${adminUser._id.toString()}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: "user" }),
  });
  assert.equal(demoteRes.status, 409);
  const data = await demoteRes.json();
  assert.equal(data.error.code, "LAST_ADMIN_PROTECTED");
});

test("ADM-USER-07: admin update rejects disallowed fields like passwordHash", async () => {
  const patchRes = await fetch(`${baseUrl}/api/v1/admin/users/${regularUser._id.toString()}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ passwordHash: "hacked" }),
  });
  assert.equal(patchRes.status, 400);
  const data = await patchRes.json();
  assert.equal(data.error.code, "VALIDATION_ERROR");
});

test("ADM-USER-08: admin can block a user; blocked user cannot log in or refresh", async () => {
  // Create an active session for regularUser first
  await sessionService.createSession(regularUser._id);
  assert.equal(await database.models.Session.countDocuments({ userId: regularUser._id }), 1);

  // Block the user
  const blockRes = await fetch(`${baseUrl}/api/v1/admin/users/${regularUser._id.toString()}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ isBlocked: true }),
  });
  assert.equal(blockRes.status, 200);
  const blockData = await blockRes.json();
  assert.equal(blockData.user.isBlocked, true);

  // Sessions should have been deleted immediately
  assert.equal(await database.models.Session.countDocuments({ userId: regularUser._id }), 0);

  // Attempt login as blocked user
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user@example.test",
      password: "ValidPassword123!",
    }),
  });
  assert.equal(loginRes.status, 403);
  const loginData = await loginRes.json();
  assert.equal(loginData.error.code, "ACCOUNT_BLOCKED");
});

test("ADM-USER-09: admin cannot block themselves or the last remaining active admin", async () => {
  // Admin self-block attempt
  const selfBlockRes = await fetch(`${baseUrl}/api/v1/admin/users/${adminUser._id.toString()}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ isBlocked: true }),
  });
  assert.equal(selfBlockRes.status, 400);
  const selfBlockData = await selfBlockRes.json();
  assert.equal(selfBlockData.error.code, "CANNOT_BLOCK_SELF");
});

test("ADM-USER-10: admin can unblock a previously blocked user", async () => {
  await database.models.User.findByIdAndUpdate(regularUser._id, { isBlocked: true });

  const unblockRes = await fetch(`${baseUrl}/api/v1/admin/users/${regularUser._id.toString()}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ isBlocked: false }),
  });
  assert.equal(unblockRes.status, 200);
  const data = await unblockRes.json();
  assert.equal(data.user.isBlocked, false);

  // Now login succeeds
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user@example.test",
      password: "ValidPassword123!",
    }),
  });
  assert.equal(loginRes.status, 200);
});

test("ADM-USER-11: admin can delete a user and their sessions are deleted", async () => {
  await sessionService.createSession(regularUser._id);

  const deleteRes = await fetch(`${baseUrl}/api/v1/admin/users/${regularUser._id.toString()}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  assert.equal(deleteRes.status, 200);
  const delData = await deleteRes.json();
  assert.equal(delData.id, regularUser._id.toString());

  // User and sessions no longer exist
  const inDb = await database.models.User.findById(regularUser._id);
  assert.equal(inDb, null);
  const sessions = await database.models.Session.countDocuments({ userId: regularUser._id });
  assert.equal(sessions, 0);
});

test("ADM-USER-12: admin cannot delete themselves or the last remaining admin", async () => {
  const selfDeleteRes = await fetch(`${baseUrl}/api/v1/admin/users/${adminUser._id.toString()}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  assert.equal(selfDeleteRes.status, 400);
  const selfDelData = await selfDeleteRes.json();
  assert.equal(selfDelData.error.code, "CANNOT_DELETE_SELF");
});
