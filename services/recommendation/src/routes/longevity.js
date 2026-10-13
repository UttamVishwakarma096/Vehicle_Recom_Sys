import { Router } from "express";
import { HttpError } from "../foundation.js";

export function createLongevityRoutes() {
  const router = Router();

  // POST /api/v1/longevity/estimate
  router.post("/estimate", (_request, _response, next) => {
    // Strictly disabled per PRD, Architecture, and ML-01 rules
    next(
      new HttpError(
        503,
        "FEATURE_NOT_ENABLED",
        "Longevity prediction is disabled. Evidence gates have not passed.",
      ),
    );
  });

  return router;
}
