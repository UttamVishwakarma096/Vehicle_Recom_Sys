import { createFoundationApp, createLogger } from "./foundation.js";
import { createAuthMiddleware } from "./auth/middleware.js";
import { TokenVerifier } from "./auth/jwt.js";
import { createServiceAuthMiddleware } from "./auth/serviceAuth.js";
import { createAdminRoutes } from "./routes/admin.js";
import { createPublicRoutes } from "./routes/public.js";
import { createInternalRoutes } from "./routes/internal.js";

export const SERVICE_NAME = "vehicle-catalog";
export const DEFAULT_PORT = 4002;

export function createApp({
  logger = createLogger(SERVICE_NAME),
  isReady = () => true,
  models = {},
  tokenVerifier,
  internalSecret,
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
  const serviceAuth = createServiceAuthMiddleware({ internalSecret });

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
        "/api/v1/admin/vehicles",
        createAdminRoutes({ models, authenticate }),
      );

      app.use("/api/v1/vehicles", createPublicRoutes({ models }));

      app.use(
        "/internal/v1/vehicles",
        createInternalRoutes({ models, serviceAuth }),
      );
    },
    { isReady },
  );
}

const app = createApp();

export default app;
