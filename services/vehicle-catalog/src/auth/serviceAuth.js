import { HttpError } from "../foundation.js";

export function createServiceAuthMiddleware({
  internalSecret = process.env.INTERNAL_SERVICE_SECRET ||
    "internal-service-secret-dev",
} = {}) {
  return function serviceAuth(request, _response, next) {
    const providedKey = request.headers["x-internal-service-key"];

    if (!providedKey || typeof providedKey !== "string") {
      return next(
        new HttpError(
          401,
          "UNAUTHORIZED",
          "Internal service authentication credential is required.",
        ),
      );
    }

    if (providedKey !== internalSecret) {
      return next(
        new HttpError(403, "FORBIDDEN", "Invalid internal service credential."),
      );
    }

    request.isInternalService = true;
    return next();
  };
}
