import { Router } from "express";
import mongoose from "mongoose";
import { HttpError } from "../foundation.js";
import { isValidObjectId } from "../vehicles/validation.js";
import { formatVehicle } from "../vehicles/formatting.js";
import {
  ALLOWED_BODY_TYPES,
  ALLOWED_FUEL_TYPES,
  ALLOWED_TRANSMISSIONS,
  ALLOWED_PRICE_TYPES,
} from "../models.js";

const ALLOWED_CANDIDATE_SEARCH_KEYS = new Set([
  "budget",
  "vehicleTypes",
  "fuelTypes",
  "transmissions",
  "minimumSeats",
  "page",
  "limit",
]);

export function createInternalRoutes({ models, serviceAuth }) {
  const router = Router();

  if (serviceAuth) {
    router.use(serviceAuth);
  }

  // POST /internal/v1/vehicles/search - Candidate search for Recommendation Service
  router.post("/search", async (request, response, next) => {
    try {
      const fieldErrors = [];
      const body = request.body;

      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new HttpError(
          400,
          "INVALID_FORMAT",
          "Request body must be a JSON object.",
        );
      }

      for (const key of Object.keys(body)) {
        if (!ALLOWED_CANDIDATE_SEARCH_KEYS.has(key)) {
          fieldErrors.push({
            field: key,
            code: "UNRECOGNIZED_FIELD",
            message: `Field '${key}' is not allowed in candidate search.`,
          });
        }
      }

      let page = 1;
      if (body.page !== undefined) {
        if (!Number.isInteger(body.page) || body.page < 1) {
          fieldErrors.push({
            field: "page",
            code: "INVALID_VALUE",
            message:
              "Page must be a positive integer greater than or equal to 1.",
          });
        } else {
          page = body.page;
        }
      }

      let limit = 20;
      if (body.limit !== undefined) {
        if (
          !Number.isInteger(body.limit) ||
          body.limit < 1 ||
          body.limit > 100
        ) {
          fieldErrors.push({
            field: "limit",
            code: "INVALID_VALUE",
            message: "Limit must be a positive integer between 1 and 100.",
          });
        } else {
          limit = body.limit;
        }
      }

      if (body.vehicleTypes !== undefined) {
        if (
          !Array.isArray(body.vehicleTypes) ||
          body.vehicleTypes.some(
            (t) => typeof t !== "string" || !ALLOWED_BODY_TYPES.includes(t),
          )
        ) {
          fieldErrors.push({
            field: "vehicleTypes",
            code: "INVALID_VALUE",
            message: `vehicleTypes must be an array of: ${ALLOWED_BODY_TYPES.join(", ")}.`,
          });
        }
      }

      if (body.fuelTypes !== undefined) {
        if (
          !Array.isArray(body.fuelTypes) ||
          body.fuelTypes.some(
            (f) => typeof f !== "string" || !ALLOWED_FUEL_TYPES.includes(f),
          )
        ) {
          fieldErrors.push({
            field: "fuelTypes",
            code: "INVALID_VALUE",
            message: `fuelTypes must be an array of: ${ALLOWED_FUEL_TYPES.join(", ")}.`,
          });
        }
      }

      if (body.transmissions !== undefined) {
        if (
          !Array.isArray(body.transmissions) ||
          body.transmissions.some(
            (t) => typeof t !== "string" || !ALLOWED_TRANSMISSIONS.includes(t),
          )
        ) {
          fieldErrors.push({
            field: "transmissions",
            code: "INVALID_VALUE",
            message: `transmissions must be an array of: ${ALLOWED_TRANSMISSIONS.join(", ")}.`,
          });
        }
      }

      if (body.minimumSeats !== undefined) {
        if (!Number.isInteger(body.minimumSeats) || body.minimumSeats < 1) {
          fieldErrors.push({
            field: "minimumSeats",
            code: "INVALID_VALUE",
            message:
              "minimumSeats must be a positive integer greater than or equal to 1.",
          });
        }
      }

      if (body.budget !== undefined) {
        if (
          typeof body.budget !== "object" ||
          body.budget === null ||
          Array.isArray(body.budget)
        ) {
          fieldErrors.push({
            field: "budget",
            code: "INVALID_FORMAT",
            message:
              "budget must be an object with min, max, priceType, and currency.",
          });
        } else {
          const { min, max, priceType, currency } = body.budget;
          if (priceType && !ALLOWED_PRICE_TYPES.includes(priceType)) {
            fieldErrors.push({
              field: "budget.priceType",
              code: "INVALID_VALUE",
              message: `priceType must be one of: ${ALLOWED_PRICE_TYPES.join(", ")}.`,
            });
          }
          if (currency && currency !== "INR") {
            fieldErrors.push({
              field: "budget.currency",
              code: "INVALID_VALUE",
              message: "currency must be 'INR'.",
            });
          }
          if (min !== undefined && (!Number.isFinite(min) || min < 0)) {
            fieldErrors.push({
              field: "budget.min",
              code: "INVALID_VALUE",
              message: "budget.min must be a finite non-negative number.",
            });
          }
          if (max !== undefined && (!Number.isFinite(max) || max <= 0)) {
            fieldErrors.push({
              field: "budget.max",
              code: "INVALID_VALUE",
              message: "budget.max must be a finite positive number.",
            });
          }
          if (min !== undefined && max !== undefined && min > max) {
            fieldErrors.push({
              field: "budget.min",
              code: "INVALID_RANGE",
              message: "budget.min cannot exceed budget.max.",
            });
          }
        }
      }

      if (fieldErrors.length > 0) {
        throw new HttpError(
          400,
          "INVALID_QUERY",
          "Invalid candidate search parameters.",
          fieldErrors,
        );
      }

      const Vehicle = models.Vehicle;
      const mongoQuery = { status: "published" };

      if (Array.isArray(body.vehicleTypes) && body.vehicleTypes.length > 0) {
        mongoQuery.bodyType = { $in: body.vehicleTypes };
      }
      if (Array.isArray(body.fuelTypes) && body.fuelTypes.length > 0) {
        mongoQuery.fuelType = { $in: body.fuelTypes };
      }
      if (Array.isArray(body.transmissions) && body.transmissions.length > 0) {
        mongoQuery.transmission = { $in: body.transmissions };
      }
      if (body.minimumSeats !== undefined) {
        mongoQuery.seatingCapacity = { $gte: body.minimumSeats };
      }

      if (body.budget) {
        const { min, max, priceType = "ex_showroom" } = body.budget;
        const priceMatch = { type: priceType, currency: "INR" };
        if (min !== undefined && max !== undefined) {
          priceMatch.amount = {
            $gte: mongoose.Types.Decimal128.fromString(min.toString()),
            $lte: mongoose.Types.Decimal128.fromString(max.toString()),
          };
        } else if (min !== undefined) {
          priceMatch.amount = {
            $gte: mongoose.Types.Decimal128.fromString(min.toString()),
          };
        } else if (max !== undefined) {
          priceMatch.amount = {
            $lte: mongoose.Types.Decimal128.fromString(max.toString()),
          };
        }
        mongoQuery.prices = { $elemMatch: priceMatch };
      }

      const [items, totalItems] = await Promise.all([
        Vehicle.find(mongoQuery)
          .sort({ createdAt: -1, _id: 1 })
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

  // POST /internal/v1/vehicles/lookup - Vehicle lookup for Recommendation & Comparison
  router.post("/lookup", async (request, response, next) => {
    try {
      const { vehicleIds } = request.body;

      if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
        throw new HttpError(
          400,
          "INVALID_FORMAT",
          "vehicleIds must be a non-empty array of vehicle ID strings.",
        );
      }

      if (vehicleIds.length > 50) {
        throw new HttpError(
          400,
          "BOUND_EXCEEDED",
          "vehicleIds array cannot exceed 50 items per lookup request.",
        );
      }

      const invalidIds = vehicleIds.filter((id) => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        throw new HttpError(
          400,
          "INVALID_IDENTIFIER",
          `All vehicle IDs must be valid 24-character hexadecimal strings. Invalid: ${invalidIds.join(", ")}.`,
        );
      }

      const distinctIds = Array.from(new Set(vehicleIds));
      const Vehicle = models.Vehicle;

      // Query only published vehicles matching distinct IDs
      const found = await Vehicle.find({
        _id: { $in: distinctIds },
        status: "published",
      }).lean();

      const foundIdSet = new Set(found.map((v) => v._id.toString()));
      const unavailableIds = distinctIds.filter((id) => !foundIdSet.has(id));

      return response.status(200).json({
        vehicles: found.map(formatVehicle),
        unavailableIds,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
