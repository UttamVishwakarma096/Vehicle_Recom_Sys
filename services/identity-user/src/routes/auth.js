import { Router } from "express";
import { HttpError } from "../foundation.js";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "../auth/passwords.js";
import { setAuthCookies, clearAuthCookies, parseCookies, getCookieNames } from "../auth/cookies.js";
import { TokenBucketRateLimiter, createRateLimiterMiddleware } from "../rateLimit.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORBIDDEN_REGISTER_KEYS = new Set(["role", "_id", "passwordHash"]);

export function createAuthRouter({
  models,
  tokenService,
  sessionService,
  authenticate,
  loginLimiter = new TokenBucketRateLimiter({
    capacity: 5,
    refillIntervalMs: 12_000,
  }),
  registerLimiter = new TokenBucketRateLimiter({
    capacity: 5,
    refillIntervalMs: 15_000,
  }),
}) {
  const router = Router();
  const getUser = () => {
    const model = models.User;
    if (!model) {
      throw new HttpError(503, "SERVICE_NOT_READY", "Database models are not ready.");
    }
    return model;
  };

  const loginRateLimitMiddleware = createRateLimiterMiddleware({
    limiter: loginLimiter,
    keyGenerator: (req) => {
      const forwarded = req.headers["x-forwarded-for"];
      const rawIp =
        (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
        req.ip ||
        req.socket?.remoteAddress ||
        "127.0.0.1";
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      return email ? `login:${rawIp}:${email}` : `login:${rawIp}`;
    },
    actionName: "login",
  });

  const registerRateLimitMiddleware = createRateLimiterMiddleware({
    limiter: registerLimiter,
    keyGenerator: (req) => {
      const forwarded = req.headers["x-forwarded-for"];
      const rawIp =
        (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
        req.ip ||
        req.socket?.remoteAddress ||
        "127.0.0.1";
      return `register:${rawIp}`;
    },
    actionName: "registration",
  });

  // JWKS discovery endpoints
  const jwksHandler = (_request, response) => {
    response.json(tokenService.getJwks());
  };
  router.get("/.well-known/jwks.json", jwksHandler);
  router.get("/api/v1/auth/jwks.json", jwksHandler);

  // Register
  router.post("/api/v1/auth/register", registerRateLimitMiddleware, async (request, response, next) => {
    const body = request.body;
    if (!body || typeof body !== "object") {
      return next(new HttpError(400, "VALIDATION_ERROR", "Request body is required."));
    }

    const fieldErrors = [];
    for (const key of Object.keys(body)) {
      if (FORBIDDEN_REGISTER_KEYS.has(key)) {
        fieldErrors.push({
          field: key,
          code: "FORBIDDEN_FIELD",
          message: `Field '${key}' cannot be supplied during registration.`,
        });
      }
    }

    const {
      email,
      password,
      displayName: directDisplayName,
      profile: clientProfile,
      ...rest
    } = body;

    const displayName =
      directDisplayName !== undefined
        ? directDisplayName
        : (clientProfile && typeof clientProfile === "object" ? clientProfile.displayName : undefined);

    for (const extraKey of Object.keys(rest)) {
      if (!FORBIDDEN_REGISTER_KEYS.has(extraKey)) {
        fieldErrors.push({
          field: extraKey,
          code: "UNRECOGNIZED_FIELD",
          message: `Unrecognized field '${extraKey}'.`,
        });
      }
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      fieldErrors.push({
        field: "email",
        code: "INVALID_EMAIL",
        message: "A valid email address is required.",
      });
    }

    const passwordCheck = validatePasswordPolicy(password);
    if (!passwordCheck.valid) {
      fieldErrors.push({
        field: "password",
        code: "INVALID_PASSWORD",
        message: passwordCheck.message,
      });
    }

    if (displayName !== undefined) {
      if (typeof displayName !== "string" || displayName.trim().length === 0 || displayName.trim().length > 50) {
        fieldErrors.push({
          field: "displayName",
          code: "INVALID_DISPLAY_NAME",
          message: "Display name must be between 1 and 50 characters.",
        });
      }
    }

    if (fieldErrors.length > 0) {
      return next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "The registration request contains invalid fields.",
          fieldErrors,
        ),
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await getUser().findOne({ email: normalizedEmail });
    if (existing) {
      return next(
        new HttpError(
          409,
          "EMAIL_ALREADY_EXISTS",
          "An account with this email address already exists.",
        ),
      );
    }

    const passwordHash = await hashPassword(password);
    const profile = displayName ? { displayName: displayName.trim() } : undefined;

    const user = await getUser().create({
      email: normalizedEmail,
      passwordHash,
      role: "user",
      profile,
    });

    return response.status(201).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        profile: user.profile || {},
      },
    });
  });

  // Login
  router.post("/api/v1/auth/login", loginRateLimitMiddleware, async (request, response, next) => {
    const { email, password, ...extra } = request.body || {};

    if (Object.keys(extra).length > 0) {
      return next(
        new HttpError(400, "VALIDATION_ERROR", "Login request contains unrecognized fields."),
      );
    }

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "Both email and password are required.",
          [
            ...(!email ? [{ field: "email", code: "REQUIRED", message: "Email is required." }] : []),
            ...(!password ? [{ field: "password", code: "REQUIRED", message: "Password is required." }] : []),
          ],
        ),
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getUser().findOne({ email: normalizedEmail }).select("+passwordHash");

    if (!user) {
      return next(
        new HttpError(
          401,
          "INVALID_CREDENTIALS",
          "Invalid email or password.",
        ),
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return next(
        new HttpError(
          401,
          "INVALID_CREDENTIALS",
          "Invalid email or password.",
        ),
      );
    }

    if (user.isBlocked) {
      return next(
        new HttpError(
          403,
          "ACCOUNT_BLOCKED",
          "This account has been blocked by an administrator.",
        ),
      );
    }

    const accessToken = tokenService.signAccessToken(user);
    const session = await sessionService.createSession(user._id);

    setAuthCookies(response, {
      accessToken,
      refreshToken: session.refreshToken,
    });

    return response.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        profile: user.profile || {},
      },
      accessToken,
      csrfToken: session.csrfToken,
    });
  });

  // Refresh
  router.post("/api/v1/auth/refresh", async (request, response, next) => {
    const cookies = parseCookies(request);
    const { refresh } = getCookieNames();
    const refreshToken = cookies[refresh] || request.body?.refreshToken;

    if (!refreshToken) {
      return next(
        new HttpError(401, "UNAUTHORIZED", "Missing refresh token."),
      );
    }

    let newSession;
    try {
      newSession = await sessionService.rotateSession(refreshToken);
    } catch (err) {
      return next(err);
    }

    const user = await getUser().findById(newSession.session.userId);
    if (!user) {
      return next(new HttpError(401, "USER_NOT_FOUND", "Account not found."));
    }

    if (user.isBlocked) {
      return next(
        new HttpError(
          403,
          "ACCOUNT_BLOCKED",
          "This account has been blocked by an administrator.",
        ),
      );
    }

    const accessToken = tokenService.signAccessToken(user);
    setAuthCookies(response, {
      accessToken,
      refreshToken: newSession.refreshToken,
    });

    return response.json({
      accessToken,
      csrfToken: newSession.csrfToken,
    });
  });

  // Logout
  router.post("/api/v1/auth/logout", authenticate(), async (request, response) => {
    const cookies = parseCookies(request);
    const { refresh } = getCookieNames();
    const refreshToken = cookies[refresh] || request.body?.refreshToken;

    if (refreshToken) {
      await sessionService.revokeSession(refreshToken);
    }
    clearAuthCookies(response);

    return response.status(204).end();
  });

  // Current identity
  router.get("/api/v1/auth/me", authenticate(), async (request, response, next) => {
    const user = await getUser().findById(request.user.id);
    if (!user) {
      return next(new HttpError(404, "USER_NOT_FOUND", "User account does not exist."));
    }

    if (user.isBlocked) {
      return next(
        new HttpError(
          403,
          "ACCOUNT_BLOCKED",
          "This account has been blocked by an administrator.",
        ),
      );
    }

    return response.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        isBlocked: Boolean(user.isBlocked),
        profile: user.profile || {},
      },
    });
  });

  return router;
}
