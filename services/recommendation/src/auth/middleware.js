import { HttpError } from "../foundation.js";
import { parseCookies, getCookieNames } from "./cookies.js";

export function createAuthMiddleware({ tokenVerifier } = {}) {
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
        if (!tokenVerifier) {
          throw new Error("TokenVerifier is not configured.");
        }
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
      request.authMethod = isCookieAuth ? "cookie" : "bearer";
      return next();
    };
  };
}
