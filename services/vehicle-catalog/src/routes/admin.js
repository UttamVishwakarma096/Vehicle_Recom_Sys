import { Router } from "express";
import mongoose from "mongoose";
import { HttpError } from "../foundation.js";
import { requireRole } from "../auth/middleware.js";
import {
  isValidObjectId,
  validateVehiclePayload,
  validatePublicationPreconditions,
} from "../vehicles/validation.js";
import { formatVehicle } from "../vehicles/formatting.js";
import { ALLOWED_STATUSES } from "../models.js";

const ALLOWED_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "make",
  "model",
  "modelYear",
]);

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export function createAdminRoutes({ models, authenticate }) {
  const router = Router();

  // All admin endpoints require authentication and 'admin' role
  router.use(authenticate());
  router.use(requireRole("admin"));

  // GET /api/v1/admin/vehicles - Paginated vehicle list for catalog administration
  router.get("/", async (request, response, next) => {
    try {
      const fieldErrors = [];
      const queryParams = request.query;

      let page = 1;
      if (queryParams.page !== undefined) {
        if (!/^\d+$/.test(queryParams.page) || Number(queryParams.page) < 1) {
          fieldErrors.push({
            field: "page",
            code: "INVALID_VALUE",
            message:
              "Page must be a positive integer greater than or equal to 1.",
          });
        } else {
          page = Number(queryParams.page);
        }
      }

      let limit = 20;
      if (queryParams.limit !== undefined) {
        if (
          !/^\d+$/.test(queryParams.limit) ||
          Number(queryParams.limit) < 1 ||
          Number(queryParams.limit) > 100
        ) {
          fieldErrors.push({
            field: "limit",
            code: "INVALID_VALUE",
            message: "Limit must be a positive integer between 1 and 100.",
          });
        } else {
          limit = Number(queryParams.limit);
        }
      }

      let status;
      if (queryParams.status !== undefined) {
        if (!ALLOWED_STATUSES.includes(queryParams.status)) {
          fieldErrors.push({
            field: "status",
            code: "INVALID_VALUE",
            message: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}.`,
          });
        } else {
          status = queryParams.status;
        }
      }

      let make;
      if (queryParams.make !== undefined) {
        if (
          typeof queryParams.make !== "string" ||
          queryParams.make.trim().length === 0
        ) {
          fieldErrors.push({
            field: "make",
            code: "INVALID_VALUE",
            message: "Make must be a non-empty string when provided.",
          });
        } else {
          make = queryParams.make.trim();
        }
      }

      let sortBy = "createdAt";
      if (queryParams.sortBy !== undefined) {
        if (!ALLOWED_SORT_FIELDS.has(queryParams.sortBy)) {
          fieldErrors.push({
            field: "sortBy",
            code: "INVALID_VALUE",
            message: `Sort field must be one of: ${Array.from(ALLOWED_SORT_FIELDS).join(", ")}.`,
          });
        } else {
          sortBy = queryParams.sortBy;
        }
      }

      let sortOrder = "desc";
      if (queryParams.sortOrder !== undefined) {
        if (
          queryParams.sortOrder !== "asc" &&
          queryParams.sortOrder !== "desc"
        ) {
          fieldErrors.push({
            field: "sortOrder",
            code: "INVALID_VALUE",
            message: "Sort order must be 'asc' or 'desc'.",
          });
        } else {
          sortOrder = queryParams.sortOrder;
        }
      }

      if (fieldErrors.length > 0) {
        throw new HttpError(
          400,
          "INVALID_QUERY",
          "Invalid query parameters.",
          fieldErrors,
        );
      }

      const Vehicle = models.Vehicle;
      const mongoQuery = {};
      if (status) {
        mongoQuery.status = status;
      }
      if (make) {
        mongoQuery.make = new RegExp(`^${escapeRegex(make)}$`, "i");
      }

      const sortOption = {
        [sortBy]: sortOrder === "asc" ? 1 : -1,
        _id: 1,
      };

      const [items, totalItems] = await Promise.all([
        Vehicle.find(mongoQuery)
          .sort(sortOption)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Vehicle.countDocuments(mongoQuery),
      ]);

      const totalPages =
        Math.ceil(totalItems / limit) || (totalItems === 0 ? 0 : 1);

      return response.status(200).json({
        items: items.map(formatVehicle),
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/admin/vehicles - Create a vehicle
  router.post("/", async (request, response, next) => {
    try {
      const fieldErrors = validateVehiclePayload(request.body, {
        isUpdate: false,
      });
      if (fieldErrors.length > 0) {
        throw new HttpError(
          400,
          "VALIDATION_FAILED",
          "Vehicle validation failed.",
          fieldErrors,
        );
      }

      const Vehicle = models.Vehicle;
      const data = { ...request.body };

      // Set actor from verified admin credential
      data.createdBy = request.user.id;

      // Status defaults to draft unless specified and valid
      if (!data.status) {
        data.status = "draft";
      } else if (data.status === "published") {
        const check = validatePublicationPreconditions(data);
        if (!check.valid) {
          throw new HttpError(
            409,
            "PUBLICATION_PRECONDITION_FAILED",
            "Vehicle cannot be published without valid pricing and data provenance.",
            check.errors,
          );
        }
        data.verifiedAt = new Date();
        data.verifiedBy = request.user.id;
      }

      // Convert prices amount to Decimal128 if needed
      if (Array.isArray(data.prices)) {
        data.prices = data.prices.map((p) => ({
          ...p,
          amount: mongoose.Types.Decimal128.fromString(p.amount.toString()),
        }));
      }

      const vehicle = new Vehicle(data);
      const saved = await vehicle.save();

      return response.status(201).json(formatVehicle(saved));
    } catch (error) {
      next(error);
    }
  });

  // PATCH /api/v1/admin/vehicles/:vehicleId - Update vehicle fields
  router.patch("/:vehicleId", async (request, response, next) => {
    try {
      const { vehicleId } = request.params;
      if (!isValidObjectId(vehicleId)) {
        throw new HttpError(
          400,
          "INVALID_IDENTIFIER",
          "Vehicle ID must be a valid 24-character hexadecimal string.",
        );
      }

      const fieldErrors = validateVehiclePayload(request.body, {
        isUpdate: true,
      });
      if (fieldErrors.length > 0) {
        throw new HttpError(
          400,
          "VALIDATION_FAILED",
          "Vehicle validation failed.",
          fieldErrors,
        );
      }

      const Vehicle = models.Vehicle;
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new HttpError(404, "NOT_FOUND", "Vehicle was not found.");
      }

      const body = request.body;
      const allowedKeys = [
        "make",
        "model",
        "modelYear",
        "variant",
        "bodyType",
        "fuelType",
        "transmission",
        "seatingCapacity",
        "imageUrl",
        "images",
        "specifications",
        "prices",
        "dataSources",
      ];

      for (const key of allowedKeys) {
        if (body[key] !== undefined) {
          if (key === "prices" && Array.isArray(body.prices)) {
            vehicle.prices = body.prices.map((p) => ({
              ...p,
              amount: mongoose.Types.Decimal128.fromString(p.amount.toString()),
            }));
          } else {
            vehicle[key] = body[key];
          }
        }
      }

      vehicle.updatedBy = request.user.id;
      const updated = await vehicle.save();

      return response.status(200).json(formatVehicle(updated));
    } catch (error) {
      next(error);
    }
  });

  // PATCH /api/v1/admin/vehicles/:vehicleId/status - Publish or unpublish vehicle
  router.patch("/:vehicleId/status", async (request, response, next) => {
    try {
      const { vehicleId } = request.params;
      if (!isValidObjectId(vehicleId)) {
        throw new HttpError(
          400,
          "INVALID_IDENTIFIER",
          "Vehicle ID must be a valid 24-character hexadecimal string.",
        );
      }

      if (
        typeof request.body !== "object" ||
        request.body === null ||
        Array.isArray(request.body)
      ) {
        throw new HttpError(
          400,
          "INVALID_FORMAT",
          "Request body must be a JSON object.",
        );
      }

      const extraKeys = Object.keys(request.body).filter((k) => k !== "status");
      if (extraKeys.length > 0) {
        throw new HttpError(
          400,
          "UNRECOGNIZED_FIELD",
          `Only 'status' is permitted on status endpoint. Extra keys: ${extraKeys.join(", ")}.`,
        );
      }

      const { status } = request.body;
      if (!status || !ALLOWED_STATUSES.includes(status)) {
        throw new HttpError(
          400,
          "INVALID_VALUE",
          `Status must be one of: ${ALLOWED_STATUSES.join(", ")}.`,
        );
      }

      const Vehicle = models.Vehicle;
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new HttpError(404, "NOT_FOUND", "Vehicle was not found.");
      }

      if (status === "published") {
        const check = validatePublicationPreconditions(vehicle);
        if (!check.valid) {
          throw new HttpError(
            409,
            "PUBLICATION_PRECONDITION_FAILED",
            "Vehicle cannot be published without valid pricing and data provenance.",
            check.errors,
          );
        }
        vehicle.verifiedAt = new Date();
        vehicle.verifiedBy = request.user.id;
      }

      vehicle.status = status;
      vehicle.updatedBy = request.user.id;
      const updated = await vehicle.save();

      return response.status(200).json(formatVehicle(updated));
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/v1/admin/vehicles/:vehicleId - Delete vehicle record
  router.delete("/:vehicleId", async (request, response, next) => {
    try {
      const { vehicleId } = request.params;
      if (!isValidObjectId(vehicleId)) {
        throw new HttpError(
          400,
          "INVALID_IDENTIFIER",
          "Vehicle ID must be a valid 24-character hexadecimal string.",
        );
      }

      const Vehicle = models.Vehicle;
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new HttpError(404, "NOT_FOUND", "Vehicle was not found.");
      }

      await vehicle.deleteOne();
      return response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
