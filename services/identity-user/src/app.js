import { createFoundationApp, createLogger } from "./foundation.js";
import { TokenService } from "./auth/jwt.js";
import { SessionService } from "./auth/sessions.js";
import { createAuthMiddleware } from "./auth/middleware.js";
import { createServiceAuthMiddleware } from "./auth/serviceAuth.js";
import { createAuthRouter } from "./routes/auth.js";
import { createUsersRouter } from "./routes/users.js";
import { createInternalUsersRouter } from "./routes/internal.js";
import { TokenBucketRateLimiter } from "./rateLimit.js";

export const SERVICE_NAME = "identity-user";
export const DEFAULT_PORT = 4001;

export function createApp({
  logger = createLogger(SERVICE_NAME),
  isReady = () => true,
  models = {},
  tokenService = new TokenService(),
  sessionService,
  allowedOrigins = [],
  internalSecret,
  loginLimiter,
  registerLimiter,
} = {}) {
  const activeSessionService =
    sessionService ||
    new SessionService({
      getSessionModel: () => models.Session,
    });

  const authenticate = createAuthMiddleware({
    tokenService,
    sessionService: activeSessionService,
    allowedOrigins,
  });

  const serviceAuth = createServiceAuthMiddleware({ internalSecret });

  const activeLoginLimiter =
    loginLimiter ||
    new TokenBucketRateLimiter({
      capacity: 5,
      refillIntervalMs: 12_000,
    });
  const activeRegisterLimiter =
    registerLimiter ||
    new TokenBucketRateLimiter({
      capacity: 5,
      refillIntervalMs: 15_000,
    });

  return createFoundationApp(
    SERVICE_NAME,
    logger,
    (app) => {
      app.loginLimiter = activeLoginLimiter;
      app.registerLimiter = activeRegisterLimiter;

      app.get("/", (_request, response) => {
        response.json({
          service: SERVICE_NAME,
          status: "scaffold",
        });
      });

      app.use(
        createAuthRouter({
          models,
          tokenService,
          sessionService: activeSessionService,
          authenticate,
          loginLimiter: activeLoginLimiter,
          registerLimiter: activeRegisterLimiter,
        }),
      );

      app.use(
        createUsersRouter({
          models,
          authenticate,
        }),
      );

      app.use(
        "/internal/v1/users",
        createInternalUsersRouter({
          models,
          serviceAuth,
        }),
      );
    },
    { isReady },
  );
}

const app = createApp();

export default app;
