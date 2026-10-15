import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { createApp as createIdentityApp, SERVICE_NAME as IDENTITY_SERVICE } from "./services/identity-user/src/app.js";
import { createDatabase as createIdentityDb } from "./services/identity-user/src/database.js";
import { createLogger as createIdentityLogger } from "./services/identity-user/src/foundation.js";

import { createApp as createCatalogApp, SERVICE_NAME as CATALOG_SERVICE } from "./services/vehicle-catalog/src/app.js";
import { createDatabase as createCatalogDb } from "./services/vehicle-catalog/src/database.js";
import { createLogger as createCatalogLogger } from "./services/vehicle-catalog/src/foundation.js";

import { createApp as createRecommendationApp, SERVICE_NAME as RECOMMENDATION_SERVICE } from "./services/recommendation/src/app.js";
import { createDatabase as createRecommendationDb } from "./services/recommendation/src/database.js";
import { createLogger as createRecommendationLogger } from "./services/recommendation/src/foundation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 10000;
const HOST = process.env.HOST || "0.0.0.0";

function resolveDatabaseUri(envUri, targetDatabase) {
  if (!envUri) return "";
  try {
    const parsed = new URL(envUri);
    parsed.pathname = `/${targetDatabase}`;
    return parsed.toString();
  } catch {
    return envUri;
  }
}

// Service Loggers
const identityLogger = createIdentityLogger(IDENTITY_SERVICE);
const catalogLogger = createCatalogLogger(CATALOG_SERVICE);
const recommendationLogger = createRecommendationLogger(RECOMMENDATION_SERVICE);

// Databases
const identityDb = createIdentityDb({ logger: identityLogger });
const catalogDb = createCatalogDb({ logger: catalogLogger });
const recommendationDb = createRecommendationDb({ logger: recommendationLogger });

// Dynamic Models Proxies
const identityModels = new Proxy({}, { get: (_, prop) => identityDb.models[prop] });
const catalogModels = new Proxy({}, { get: (_, prop) => catalogDb.models[prop] });
const recommendationModels = new Proxy({}, { get: (_, prop) => recommendationDb.models[prop] });

// Initialize Express microservice applications
const identityApp = createIdentityApp({
  logger: identityLogger,
  isReady: identityDb.isReady,
  models: identityModels,
});

const catalogApp = createCatalogApp({
  logger: catalogLogger,
  isReady: catalogDb.isReady,
  models: catalogModels,
});

const recommendationApp = createRecommendationApp({
  logger: recommendationLogger,
  isReady: recommendationDb.isReady,
  models: recommendationModels,
});

// Root Ingress Application
const app = express();
app.disable("x-powered-by");

// Unified health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    services: {
      identity: identityDb.isReady() ? "ready" : "unready",
      catalog: catalogDb.isReady() ? "ready" : "unready",
      recommendation: recommendationDb.isReady() ? "ready" : "unready",
    },
  });
});

// Route API requests to the owning microservice Express app
app.use((req, res, next) => {
  const p = req.path;

  // 1. Identity and User Service routes
  if (
    p.startsWith("/api/v1/auth") ||
    p.startsWith("/api/v1/users") ||
    p.startsWith("/api/v1/admin/users") ||
    p.startsWith("/internal/v1/users") ||
    p === "/.well-known/jwks.json"
  ) {
    return identityApp(req, res, next);
  }

  // 2. Vehicle Catalog Service routes
  if (
    p.startsWith("/api/v1/vehicles") ||
    p.startsWith("/api/v1/admin/vehicles") ||
    p.startsWith("/internal/v1/vehicles")
  ) {
    return catalogApp(req, res, next);
  }

  // 3. Recommendation Service routes
  if (
    p.startsWith("/api/v1/recommendations") ||
    p.startsWith("/api/v1/compare") ||
    p.startsWith("/api/v1/favorites") ||
    p.startsWith("/api/v1/longevity") ||
    p.startsWith("/api/v1/ai")
  ) {
    return recommendationApp(req, res, next);
  }

  next();
});

// Serve compiled React frontend assets
const clientDist = path.join(__dirname, "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  // SPA fallback for any non-API route
  app.use((req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.use((req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Vehicle Recommendation System</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2>API Server is Running</h2>
          <p>Client build not found. Run <code>npm run build</code> to compile the frontend bundle.</p>
        </body>
      </html>
    `);
  });
}

// Connect Databases Asynchronously
async function connectServices() {
  const baseUri = process.env.MONGODB_URI || "";

  const identityUri = process.env.MONGODB_IDENTITY_URI || resolveDatabaseUri(baseUri, "vehicle_identity");
  const catalogUri = process.env.MONGODB_CATALOG_URI || resolveDatabaseUri(baseUri, "vehicle_catalog");
  const recommendationUri = process.env.MONGODB_RECOMMENDATION_URI || resolveDatabaseUri(baseUri, "vehicle_recommendations");

  if (identityUri) {
    identityDb.connect(identityUri).catch((err) => identityLogger.error("db.identity.failed", { error: err.message }));
  }
  if (catalogUri) {
    catalogDb.connect(catalogUri).catch((err) => catalogLogger.error("db.catalog.failed", { error: err.message }));
  }
  if (recommendationUri) {
    recommendationDb.connect(recommendationUri).catch((err) => recommendationLogger.error("db.recommendation.failed", { error: err.message }));
  }
}

const server = app.listen(PORT, HOST, () => {
  console.log(`[Unified Server] Ingress running at http://${HOST}:${PORT}`);
  connectServices();
});

process.on("SIGTERM", async () => {
  console.log("[Unified Server] SIGTERM received. Shutting down gracefully...");
  server.close(async () => {
    await Promise.allSettled([
      identityDb.close(),
      catalogDb.close(),
      recommendationDb.close(),
    ]);
    process.exit(0);
  });
});
