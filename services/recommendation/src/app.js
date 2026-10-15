import { createFoundationApp, createLogger } from "./foundation.js";
import { TokenVerifier } from "./auth/jwt.js";
import { createAuthMiddleware } from "./auth/middleware.js";
import { CatalogClient } from "./clients/catalogClient.js";
import { IdentityClient } from "./clients/identityClient.js";
import { createRecommendationRoutes } from "./routes/recommendations.js";
import { createCompareRoutes } from "./routes/compare.js";
import { createFavoritesRoutes } from "./routes/favorites.js";
import { createLongevityRoutes } from "./routes/longevity.js";
import { createAiRoutes } from "./routes/ai.js";

export const SERVICE_NAME = "recommendation";
export const DEFAULT_PORT = 4003;

export function createApp({
  logger = createLogger(SERVICE_NAME),
  isReady = () => true,
  models = {},
  tokenVerifier,
  catalogClient,
  identityClient,
} = {}) {
  const jwksUri =
    process.env.IDENTITY_JWKS_URL ||
    (process.env.IDENTITY_SERVICE_URL
      ? `${process.env.IDENTITY_SERVICE_URL}/.well-known/jwks.json`
      : "http://127.0.0.1:4001/.well-known/jwks.json");

  const verifier =
    tokenVerifier ??
    (process.env.JWT_PUBLIC_KEY
      ? new TokenVerifier({ publicKey: process.env.JWT_PUBLIC_KEY })
      : new TokenVerifier({ jwksUri }));

  const authenticate = createAuthMiddleware({ tokenVerifier: verifier });

  const resolvedCatalogClient =
    catalogClient ??
    new CatalogClient({
      baseUrl: process.env.CATALOG_SERVICE_URL || "http://127.0.0.1:4002",
    });

  const resolvedIdentityClient =
    identityClient ??
    new IdentityClient({
      baseUrl: process.env.IDENTITY_SERVICE_URL || "http://127.0.0.1:4001",
    });

  return createFoundationApp(
    SERVICE_NAME,
    logger,
    (app) => {
      app.get("/", (_request, response) => {
        response.json({
          service: SERVICE_NAME,
          status: "scaffold",
        });
      });

      app.use(
        "/api/v1/recommendations",
        createRecommendationRoutes({
          catalogClient: resolvedCatalogClient,
          identityClient: resolvedIdentityClient,
          authenticate,
        }),
      );

      app.use(
        "/api/v1/compare",
        createCompareRoutes({
          catalogClient: resolvedCatalogClient,
          authenticate,
        }),
      );

      app.use(
        "/api/v1/favorites",
        createFavoritesRoutes({
          models,
          catalogClient: resolvedCatalogClient,
          authenticate,
        }),
      );

      app.use(
        "/api/v1/longevity",
        createLongevityRoutes(),
      );

      app.use(
        "/api/v1/ai",
        createAiRoutes({
          catalogClient: resolvedCatalogClient,
          authenticate,
        }),
      );
    },
    { isReady },
  );
}

const app = createApp();

export default app;
