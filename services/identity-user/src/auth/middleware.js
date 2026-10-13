import { HttpError } from "../foundation.js";
import { parseCookies, getCookieNames } from "./cookies.js";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function createAuthMiddleware({ tokenService, sessionService, allowedOrigins = [] } = {}) {
  return function authenticate({ optional = false } = {}) {
    return async function (request, _response, next) {
      let token;
      let isCookieAuth = false;

      const authHeader = request.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7).trim();
      }

      if (!token) {
        const cookies = parseCookies(request);
        const { access } = getCookieNames();
        if (cookies[access]) {
          token = cookies[access];
          isCookieAuth = true;
        }
      }

      if (!token) {
        if (optional) {
          request.user = null;
          return next();
        }
        return next(
          new HttpError(401, "UNAUTHORIZED", "Authentication credential is required."),
        );
      }

      let payload;
      try {
        payload = tokenService.verifyAccessToken(token);
      } catch {
        if (optional) {
          request.user = null;
          return next();
        }
        return next(
          new HttpError(
            401,
            "INVALID_CREDENTIALS",
            "Invalid or expired authentication token.",
          ),
        );
      }

      // CSRF protection for cookie-authenticated state-changing requests
      if (isCookieAuth && STATE_CHANGING_METHODS.has(request.method)) {
        const origin = request.headers.origin;
        if (origin && allowedOrigins.length > 0) {
          const originAllowed = allowedOrigins.some((allowed) => origin === allowed);
          if (!originAllowed) {
            return next(
              new HttpError(403, "CSRF_ORIGIN_INVALID", "Request origin is not allowed."),
            );
          }
        }

        const clientCsrf = request.headers["x-csrf-token"];
        if (!clientCsrf || typeof clientCsrf !== "string") {
          return next(
            new HttpError(
              403,
              "CSRF_TOKEN_MISSING",
              "A valid X-CSRF-Token header is required for cookie-authenticated state changes.",
            ),
          );
        }

        if (sessionService) {
          const cookies = parseCookies(request);
          const { refresh } = getCookieNames();
          const refreshToken = cookies[refresh];
          if (refreshToken) {
            const session = await sessionService.findSessionByToken(refreshToken);
            if (!session || session.csrfToken !== clientCsrf) {
              return next(
                new HttpError(
                  403,
                  "CSRF_TOKEN_INVALID",
                  "Invalid CSRF token.",
                ),
              );
            }
          }
        }
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      request.authMethod = isCookieAuth ? "cookie" : "bearer";
      return next();
    };
  };
}

export function requireRole(requiredRole) {
  return function (request, _response, next) {
    if (!request.user) {
      return next(
        new HttpError(401, "UNAUTHORIZED", "Authentication credential is required."),
      );
    }
    if (request.user.role !== requiredRole) {
      return next(
        new HttpError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action.",
        ),
      );
    }
    return next();
  };
}
