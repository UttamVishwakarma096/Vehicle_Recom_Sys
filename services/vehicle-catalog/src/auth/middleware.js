import { HttpError } from "../foundation.js";
import { parseCookies, COOKIE_NAME_ACCESS } from "./cookies.js";

export function createAuthMiddleware({ tokenVerifier } = {}) {
  return function authenticate({ optional = false } = {}) {
    return async function (request, _response, next) {
      let token;

      const authHeader = request.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7).trim();
      }

      if (!token) {
        const cookies = parseCookies(request);
        if (cookies[COOKIE_NAME_ACCESS]) {
          token = cookies[COOKIE_NAME_ACCESS];
        }
      }

      if (!token) {
        if (optional) {
          request.user = null;
          return next();
        }
        return next(
          new HttpError(
            401,
            "UNAUTHORIZED",
            "Authentication credential is required.",
          ),
        );
      }

      if (!tokenVerifier) {
        return next(
          new HttpError(
            500,
            "AUTH_NOT_CONFIGURED",
            "Authentication verifier is not configured.",
          ),
        );
      }

      let payload;
      try {
        payload = await tokenVerifier.verifyAccessToken(token);
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

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return next();
    };
  };
}

export function requireRole(requiredRole) {
  return function (request, _response, next) {
    if (!request.user) {
      return next(
        new HttpError(
          401,
          "UNAUTHORIZED",
          "Authentication credential is required.",
        ),
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
