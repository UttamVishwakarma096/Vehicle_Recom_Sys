import { Router } from "express";
import mongoose from "mongoose";
import { HttpError } from "../foundation.js";
import { requireRole } from "../auth/middleware.js";

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

const ALLOWED_ADMIN_UPDATE_KEYS = new Set(["role", "profile", "isBlocked"]);
const ALLOWED_PROFILE_KEYS = new Set(["displayName", "city"]);

function formatAdminUser(user) {
  if (!user) return null;
  const doc = typeof user.toObject === "function" ? user.toObject() : user;
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    email: doc.email,
    role: doc.role,
    isBlocked: Boolean(doc.isBlocked),
    profile: doc.profile || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function createAdminUsersRouter({ models, authenticate }) {
  const router = Router();

  const getUser = () => {
    const model = models.User;
    if (!model) {
      throw new HttpError(503, "SERVICE_NOT_READY", "Database models are not ready.");
    }
    return model;
  };

  // Require authentication and 'admin' role for all admin user routes
  router.use(authenticate());
  router.use(requireRole("admin"));

  // GET /api/v1/admin/users - Paginated user directory with search/role filters
  router.get("/", async (request, response, next) => {
    try {
      const queryParams = request.query;
      const fieldErrors = [];

      let page = 1;
      if (queryParams.page !== undefined) {
        if (!/^\d+$/.test(queryParams.page) || Number(queryParams.page) < 1) {
          fieldErrors.push({
            field: "page",
            code: "INVALID_VALUE",
            message: "Page must be a positive integer greater than or equal to 1.",
          });
        } else {
          page = Number(queryParams.page);
        }
      }

      let limit = 20;
      if (queryParams.limit !== undefined) {
        if (!/^\d+$/.test(queryParams.limit) || Number(queryParams.limit) < 1 || Number(queryParams.limit) > 100) {
          fieldErrors.push({
            field: "limit",
            code: "INVALID_VALUE",
            message: "Limit must be a positive integer between 1 and 100.",
          });
        } else {
          limit = Number(queryParams.limit);
        }
      }

      let role;
      if (queryParams.role !== undefined) {
        if (queryParams.role !== "user" && queryParams.role !== "admin") {
          fieldErrors.push({
            field: "role",
            code: "INVALID_VALUE",
            message: "Role must be 'user' or 'admin'.",
          });
        } else {
          role = queryParams.role;
        }
      }

      let status;
      if (queryParams.status !== undefined) {
        if (queryParams.status !== "active" && queryParams.status !== "blocked") {
          fieldErrors.push({
            field: "status",
            code: "INVALID_VALUE",
            message: "Status must be 'active' or 'blocked'.",
          });
        } else {
          status = queryParams.status;
        }
      }

      if (fieldErrors.length > 0) {
        throw new HttpError(400, "INVALID_QUERY", "Invalid query parameters.", fieldErrors);
      }

      const mongoQuery = {};
      if (role) {
        mongoQuery.role = role;
      }
      if (status === "active") {
        mongoQuery.isBlocked = false;
      } else if (status === "blocked") {
        mongoQuery.isBlocked = true;
      }

      if (typeof queryParams.search === "string" && queryParams.search.trim().length > 0) {
        const escaped = escapeRegex(queryParams.search.trim());
        const regex = new RegExp(escaped, "i");
        mongoQuery.$or = [
          { email: regex },
          { "profile.displayName": regex },
          { "profile.city": regex },
        ];
      }

      const User = getUser();
      const [users, totalItems] = await Promise.all([
        User.find(mongoQuery)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        User.countDocuments(mongoQuery),
      ]);

      const totalPages = Math.ceil(totalItems / limit) || (totalItems === 0 ? 0 : 1);

      return response.status(200).json({
        items: users.map(formatAdminUser),
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/v1/admin/users/:id - Update user role or profile
  router.patch("/:id", async (request, response, next) => {
    try {
      const { id } = request.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new HttpError(400, "INVALID_IDENTIFIER", "User ID is not a valid identifier.");
      }

      const body = request.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
      }

      const fieldErrors = [];
      for (const key of Object.keys(body)) {
        if (!ALLOWED_ADMIN_UPDATE_KEYS.has(key)) {
          fieldErrors.push({
            field: key,
            code: "FORBIDDEN_FIELD",
            message: `Field '${key}' cannot be modified by admin.`,
          });
        }
      }

      if (body.role !== undefined) {
        if (body.role !== "user" && body.role !== "admin") {
          fieldErrors.push({
            field: "role",
            code: "INVALID_ROLE",
            message: "Role must be 'user' or 'admin'.",
          });
        }
      }

      if (body.isBlocked !== undefined) {
        if (typeof body.isBlocked !== "boolean") {
          fieldErrors.push({
            field: "isBlocked",
            code: "INVALID_VALUE",
            message: "isBlocked must be a boolean.",
          });
        }
      }

      if (body.profile !== undefined) {
        if (typeof body.profile !== "object" || body.profile === null || Array.isArray(body.profile)) {
          fieldErrors.push({
            field: "profile",
            code: "INVALID_PROFILE",
            message: "Profile must be an object.",
          });
        } else {
          for (const k of Object.keys(body.profile)) {
            if (!ALLOWED_PROFILE_KEYS.has(k)) {
              fieldErrors.push({
                field: `profile.${k}`,
                code: "UNRECOGNIZED_FIELD",
                message: `Field '${k}' is not allowed in profile.`,
              });
            }
          }
        }
      }

      if (fieldErrors.length > 0) {
        throw new HttpError(400, "VALIDATION_ERROR", "Validation failed.", fieldErrors);
      }

      const User = getUser();
      const targetUser = await User.findById(id);
      if (!targetUser) {
        throw new HttpError(404, "USER_NOT_FOUND", "User not found.");
      }

      // Safety check: if demoting an admin, ensure there is at least one other admin
      if (body.role === "user" && targetUser.role === "admin") {
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
          throw new HttpError(
            409,
            "LAST_ADMIN_PROTECTED",
            "Cannot demote the last remaining administrator in the system.",
          );
        }
      }

      // Safety check: blocking validations
      if (body.isBlocked === true) {
        if (targetUser._id.toString() === request.user.id) {
          throw new HttpError(
            400,
            "CANNOT_BLOCK_SELF",
            "Cannot block your own administrator account.",
          );
        }
        if (targetUser.role === "admin") {
          const activeAdminCount = await User.countDocuments({
            role: "admin",
            isBlocked: { $ne: true },
          });
          if (activeAdminCount <= 1) {
            throw new HttpError(
              409,
              "LAST_ADMIN_PROTECTED",
              "Cannot block the last remaining active administrator in the system.",
            );
          }
        }
      }

      if (body.role !== undefined) {
        targetUser.role = body.role;
      }

      if (body.isBlocked !== undefined) {
        targetUser.isBlocked = body.isBlocked;
        if (body.isBlocked === true && models.Session) {
          await models.Session.deleteMany({ userId: targetUser._id });
        }
      }

      if (body.profile !== undefined) {
        targetUser.profile = {
          ...(targetUser.profile || {}),
          ...body.profile,
        };
      }

      await targetUser.save();

      return response.status(200).json({
        user: formatAdminUser(targetUser),
      });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/v1/admin/users/:id - Delete user account and revoke sessions
  router.delete("/:id", async (request, response, next) => {
    try {
      const { id } = request.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new HttpError(400, "INVALID_IDENTIFIER", "User ID is not a valid identifier.");
      }

      const User = getUser();
      const targetUser = await User.findById(id);
      if (!targetUser) {
        throw new HttpError(404, "USER_NOT_FOUND", "User not found.");
      }

      if (targetUser._id.toString() === request.user.id) {
        throw new HttpError(
          400,
          "CANNOT_DELETE_SELF",
          "Cannot delete your own administrator account.",
        );
      }

      if (targetUser.role === "admin") {
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
          throw new HttpError(
            409,
            "LAST_ADMIN_PROTECTED",
            "Cannot delete the last remaining administrator in the system.",
          );
        }
      }

      if (models.Session) {
        await models.Session.deleteMany({ userId: targetUser._id });
      }

      await User.findByIdAndDelete(id);

      return response.status(200).json({
        message: "User deleted successfully.",
        id,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
