import assert from "node:assert/strict";
import { test } from "node:test";
import { EventEmitter } from "node:events";
import { createApp, DEFAULT_PORT, SERVICE_NAME } from "../src/app.js";
import {
  createFoundationApp,
  createLogger,
  loadServiceConfig,
  registerGracefulShutdown,
} from "../src/foundation.js";

async function withServer(app, callback) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`, server);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("root route identifies the identity service scaffold", async () => {
  await withServer(createApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      service: SERVICE_NAME,
      status: "scaffold",
    });
  });
});

test("health endpoints identify process health and preserve correlation IDs", async () => {
  await withServer(createApp(), async (baseUrl) => {
    for (const path of ["/health", "/health/live", "/health/ready"]) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { "X-Correlation-ID": "health-check_123" },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-correlation-id"), "health-check_123");
      assert.deepEqual(await response.json(), {
        service: SERVICE_NAME,
        status: "ok",
      });
    }

    const replaced = await fetch(`${baseUrl}/health`, {
      headers: { "X-Correlation-ID": "invalid ID" },
    });
    assert.match(
      replaced.headers.get("x-correlation-id"),
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

test("readiness returns a safe correlated 503 when its database is unavailable", async () => {
  await withServer(createApp({ isReady: () => false }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health/ready`, {
      headers: { "X-Correlation-ID": "db-not-ready" },
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("x-correlation-id"), "db-not-ready");
    assert.deepEqual(await response.json(), { error: {
      code: "SERVICE_NOT_READY",
      message: "A required service dependency is unavailable.",
      correlationId: "db-not-ready",
    } });
  });
});

test("unknown routes use the safe error envelope and emit a correlated log", async () => {
  const lines = [];
  const app = createApp({ logger: createLogger(SERVICE_NAME, (line) => lines.push(line)) });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/missing`, {
      headers: { "X-Correlation-ID": "request-42" },
    });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-correlation-id"), "request-42");
    assert.deepEqual(await response.json(), {
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        correlationId: "request-42",
      },
    });
  });

  const entry = JSON.parse(lines[0]);
  assert.equal(entry.level, "warn");
  assert.equal(entry.category, "NOT_FOUND");
  assert.equal(entry.correlationId, "request-42");
  assert.equal(entry.service, SERVICE_NAME);
  assert.equal(JSON.stringify(entry).includes("/missing"), false);
});

test("unexpected errors do not expose internal messages or stacks", async () => {
  const lines = [];
  const logger = createLogger(SERVICE_NAME, (line) => lines.push(line));
  const app = createFoundationApp(SERVICE_NAME, logger, (serviceApp) => {
    serviceApp.get("/failure", () => {
      throw new Error("private failure details");
    });
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/failure`, {
      headers: { "X-Correlation-ID": "failure-42" },
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
        correlationId: "failure-42",
      },
    });
  });

  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes("private failure details"), false);
});

test("malformed JSON and non-JSON bodies are rejected consistently", async () => {
  await withServer(createApp(), async (baseUrl) => {
    const invalidJson = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(invalidJson.status, 400);
    assert.deepEqual(await invalidJson.json(), {
      error: {
        code: "INVALID_JSON",
        message: "The request body contains invalid JSON.",
        correlationId: invalidJson.headers.get("x-correlation-id"),
      },
    });

    const unsupported = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    assert.equal(unsupported.status, 415);
    assert.equal((await unsupported.json()).error.code, "UNSUPPORTED_MEDIA_TYPE");
  });
});

test("request bodies larger than 64 KiB are rejected", async () => {
  await withServer(createApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(65 * 1024) }),
    });
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error.code, "REQUEST_TOO_LARGE");
  });
});

test("service configuration rejects invalid ports and hosts", () => {
  assert.deepEqual(loadServiceConfig(SERVICE_NAME, DEFAULT_PORT, {}), {
    service: SERVICE_NAME,
    host: "127.0.0.1",
    port: DEFAULT_PORT,
    databaseUri: "",
    databaseName: "vehicle_identity",
  });
  assert.equal(
    loadServiceConfig(SERVICE_NAME, DEFAULT_PORT, { PORT: "65535", HOST: "::1" })
      .port,
    65535,
  );
  assert.equal(loadServiceConfig(SERVICE_NAME, DEFAULT_PORT, {
    MONGODB_URI: "mongodb://test-user:test-password@127.0.0.1:27017/vehicle_identity",
  }).databaseUri, "mongodb://test-user:test-password@127.0.0.1:27017/vehicle_identity");
  assert.throws(() => loadServiceConfig(SERVICE_NAME, DEFAULT_PORT, {
    MONGODB_URI: "mongodb://test-user:test-password@127.0.0.1:27017/vehicle_catalog",
  }), /must target the vehicle_identity database/);

  for (const port of ["0", "65536", "4.2", "-1", "abc"]) {
    assert.throws(
      () => loadServiceConfig(SERVICE_NAME, DEFAULT_PORT, { PORT: port }),
      /PORT must be an integer/,
    );
  }
  assert.throws(
    () => loadServiceConfig(SERVICE_NAME, DEFAULT_PORT, { HOST: "bad host" }),
    /HOST must be a valid/,
  );
});

test("graceful shutdown closes the listener and records lifecycle events", async () => {
  const lines = [];
  const logger = createLogger(SERVICE_NAME, (line) => lines.push(line));
  const processRef = new EventEmitter();
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  const shutdown = registerGracefulShutdown(server, logger, { processRef });
  await shutdown("SIGTERM");

  assert.equal(server.listening, false);
  assert.deepEqual(
    lines.map((line) => JSON.parse(line).event),
    ["server.shutdown.started", "server.stopped"],
  );
  assert.equal(processRef.exitCode, undefined);
});
