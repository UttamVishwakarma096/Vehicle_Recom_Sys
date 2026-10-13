import { Router } from "express";
import { HttpError } from "../foundation.js";

function isValidObjectId(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

export function createInternalUsersRouter({ models, serviceAuth }) {
  const router = Router();

  if (serviceAuth) {
    router.use(serviceAuth);
  }

  // GET /internal/v1/users/:userId/preferences - Retrieve user preferences for Recommendation Service
  router.get("/:userId/preferences", async (request, response, next) => {
    try {
      const { userId } = request.params;

      if (!isValidObjectId(userId)) {
        throw new HttpError(
          400,
          "INVALID_IDENTIFIER",
          "User ID must be a valid 24-character hexadecimal string.",
        );
      }

      const User = models.User;
      const user = await User.findById(userId).lean();

      if (!user) {
        throw new HttpError(404, "NOT_FOUND", "User was not found.");
      }

      return response.status(200).json({
        userId,
        preferences: user.preferences || {},
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
