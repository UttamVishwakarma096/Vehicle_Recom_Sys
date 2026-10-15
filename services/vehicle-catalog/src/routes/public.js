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

const ALLOWED_PUBLIC_QUERY_KEYS = new Set([
  "page",
  "limit",
  "q",
  "make",
  "bodyType",
  "fuelType",
  "transmission",
  "seatingCapacity",
  "minPrice",
  "maxPrice",
  "priceType",
  "sortBy",
  "sortOrder",
]);

const ALLOWED_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "make",
  "model",
  "modelYear",
  "price",
]);

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export function createPublicRoutes({ models }) {
  const router = Router();

  // GET /api/v1/vehicles - List, search, filter, and paginate published vehicles
  router.get("/", async (request, response, next) => {
    try {
      const fieldErrors = [];
      const queryParams = request.query;

      // Validate allowed query keys and disallow operator/object injection
      for (const [key, value] of Object.entries(queryParams)) {
        if (!ALLOWED_PUBLIC_QUERY_KEYS.has(key)) {
          fieldErrors.push({
            field: key,
            code: "UNRECOGNIZED_PARAM",
            message: `Query parameter '${key}' is not allowed.`,
          });
          continue;
        }
        if (typeof value !== "string") {
          fieldErrors.push({
            field: key,
            code: "INVALID_FORMAT",
            message: `Query parameter '${key}' must be a string.`,
          });
        }
      }

      let page = 1;
      if (
        queryParams.page !== undefined &&
        typeof queryParams.page === "string"
      ) {
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
      if (
        queryParams.limit !== undefined &&
        typeof queryParams.limit === "string"
      ) {
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

      let q;
      if (queryParams.q !== undefined && typeof queryParams.q === "string") {
        const trimmed = queryParams.q.trim();
        if (trimmed.length > 100) {
          fieldErrors.push({
            field: "q",
            code: "INVALID_VALUE",
            message: "Search query 'q' cannot exceed 100 characters.",
          });
        } else if (trimmed.length > 0) {
          q = trimmed;
        }
      }

      let make;
      if (
        queryParams.make !== undefined &&
        typeof queryParams.make === "string"
      ) {
        const trimmed = queryParams.make.trim();
        if (trimmed.length > 100) {
          fieldErrors.push({
            field: "make",
            code: "INVALID_VALUE",
            message: "Make cannot exceed 100 characters.",
          });
        } else if (trimmed.length > 0) {
          make = trimmed;
        }
      }

      let bodyType;
      if (
        queryParams.bodyType !== undefined &&
        typeof queryParams.bodyType === "string"
      ) {
        if (!ALLOWED_BODY_TYPES.includes(queryParams.bodyType)) {
          fieldErrors.push({
            field: "bodyType",
            code: "INVALID_VALUE",
            message: `Body type must be one of: ${ALLOWED_BODY_TYPES.join(", ")}.`,
          });
        } else {
          bodyType = queryParams.bodyType;
        }
      }

      let fuelType;
      if (
        queryParams.fuelType !== undefined &&
        typeof queryParams.fuelType === "string"
      ) {
        if (!ALLOWED_FUEL_TYPES.includes(queryParams.fuelType)) {
          fieldErrors.push({
            field: "fuelType",
            code: "INVALID_VALUE",
            message: `Fuel type must be one of: ${ALLOWED_FUEL_TYPES.join(", ")}.`,
          });
        } else {
          fuelType = queryParams.fuelType;
        }
      }

      let transmission;
      if (
        queryParams.transmission !== undefined &&
        typeof queryParams.transmission === "string"
      ) {
        if (!ALLOWED_TRANSMISSIONS.includes(queryParams.transmission)) {
          fieldErrors.push({
            field: "transmission",
            code: "INVALID_VALUE",
            message: `Transmission must be one of: ${ALLOWED_TRANSMISSIONS.join(", ")}.`,
          });
        } else {
          transmission = queryParams.transmission;
        }
      }

      let seatingCapacity;
      if (
        queryParams.seatingCapacity !== undefined &&
        typeof queryParams.seatingCapacity === "string"
      ) {
        if (
          !/^\d+$/.test(queryParams.seatingCapacity) ||
          Number(queryParams.seatingCapacity) < 1
        ) {
          fieldErrors.push({
            field: "seatingCapacity",
            code: "INVALID_VALUE",
            message:
              "Seating capacity must be a positive integer greater than or equal to 1.",
          });
        } else {
          seatingCapacity = Number(queryParams.seatingCapacity);
        }
      }

      let priceType;
      if (
        queryParams.priceType !== undefined &&
        typeof queryParams.priceType === "string"
      ) {
        if (!ALLOWED_PRICE_TYPES.includes(queryParams.priceType)) {
          fieldErrors.push({
            field: "priceType",
            code: "INVALID_VALUE",
            message: `Price type must be one of: ${ALLOWED_PRICE_TYPES.join(", ")}.`,
          });
        } else {
          priceType = queryParams.priceType;
        }
      }

      let minPrice;
      if (
        queryParams.minPrice !== undefined &&
        typeof queryParams.minPrice === "string"
      ) {
        const num = Number(queryParams.minPrice);
        if (!Number.isFinite(num) || num < 0) {
          fieldErrors.push({
            field: "minPrice",
            code: "INVALID_VALUE",
            message: "minPrice must be a finite non-negative number.",
          });
        } else {
          minPrice = num;
        }
      }

      let maxPrice;
      if (
        queryParams.maxPrice !== undefined &&
        typeof queryParams.maxPrice === "string"
      ) {
        const num = Number(queryParams.maxPrice);
        if (!Number.isFinite(num) || num <= 0) {
          fieldErrors.push({
            field: "maxPrice",
            code: "INVALID_VALUE",
            message:
              "maxPrice must be a finite positive number greater than zero.",
          });
        } else {
          maxPrice = num;
        }
      }

      if ((minPrice !== undefined || maxPrice !== undefined) && !priceType) {
        fieldErrors.push({
          field: "priceType",
          code: "REQUIRED_FIELD",
          message:
            "priceType is required when filtering with minPrice or maxPrice.",
        });
      }

      if (
        minPrice !== undefined &&
        maxPrice !== undefined &&
        minPrice > maxPrice
      ) {
        fieldErrors.push({
          field: "minPrice",
          code: "INVALID_RANGE",
          message: "minPrice cannot be greater than maxPrice.",
        });
      }

      let sortBy = "createdAt";
      if (
        queryParams.sortBy !== undefined &&
        typeof queryParams.sortBy === "string"
      ) {
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

      if (sortBy === "price" && !priceType) {
        fieldErrors.push({
          field: "priceType",
          code: "REQUIRED_FIELD",
          message: "priceType is required when sorting by price.",
        });
      }

      let sortOrder =
        sortBy === "price" || sortBy === "make" || sortBy === "model"
          ? "asc"
          : "desc";
      if (
        queryParams.sortOrder !== undefined &&
        typeof queryParams.sortOrder === "string"
      ) {
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
      const mongoQuery = { status: "published" };

      if (q) {
        const escaped = escapeRegex(q);
        mongoQuery.$or = [
          { model: new RegExp(escaped, "i") },
          { make: new RegExp(escaped, "i") },
          { variant: new RegExp(escaped, "i") },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ["$make", " ", "$model"] },
                regex: escaped,
                options: "i",
              },
            },
          },
        ];
      }

      if (make) {
        mongoQuery.make = new RegExp(`^${escapeRegex(make)}$`, "i");
      }
      if (bodyType) {
        mongoQuery.bodyType = bodyType;
      }
      if (fuelType) {
        mongoQuery.fuelType = fuelType;
      }
      if (transmission) {
        mongoQuery.transmission = transmission;
      }
      if (seatingCapacity !== undefined) {
        mongoQuery.seatingCapacity = seatingCapacity;
      }

      if (priceType) {
        const priceMatch = { type: priceType, currency: "INR" };
        if (minPrice !== undefined && maxPrice !== undefined) {
          priceMatch.amount = {
            $gte: mongoose.Types.Decimal128.fromString(minPrice.toString()),
            $lte: mongoose.Types.Decimal128.fromString(maxPrice.toString()),
          };
        } else if (minPrice !== undefined) {
          priceMatch.amount = {
            $gte: mongoose.Types.Decimal128.fromString(minPrice.toString()),
          };
        } else if (maxPrice !== undefined) {
          priceMatch.amount = {
            $lte: mongoose.Types.Decimal128.fromString(maxPrice.toString()),
          };
        }
        mongoQuery.prices = { $elemMatch: priceMatch };
      }

      let items;
      let totalItems;

      if (sortBy === "price") {
        const sortDirection = sortOrder === "asc" ? 1 : -1;
        const pipeline = [
          { $match: mongoQuery },
          {
            $addFields: {
              sortPrice: {
                $let: {
                  vars: {
                    matchedPrice: {
                      $first: {
                        $filter: {
                          input: "$prices",
                          as: "p",
                          cond: { $eq: ["$$p.type", priceType] },
                        },
                      },
                    },
                  },
                  in: "$$matchedPrice.amount",
                },
              },
            },
          },
          { $sort: { sortPrice: sortDirection, _id: 1 } },
          {
            $facet: {
              metadata: [{ $count: "totalItems" }],
              records: [{ $skip: (page - 1) * limit }, { $limit: limit }],
            },
          },
        ];

        const [aggregationResult] = await Vehicle.aggregate(pipeline);
        totalItems = aggregationResult?.metadata?.[0]?.totalItems ?? 0;
        items = aggregationResult?.records ?? [];
      } else {
        const sortOptions = {
          [sortBy]: sortOrder === "asc" ? 1 : -1,
          _id: 1,
        };

        [items, totalItems] = await Promise.all([
          Vehicle.find(mongoQuery)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
          Vehicle.countDocuments(mongoQuery),
        ]);
      }

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

  // GET /api/v1/vehicles/:vehicleId - Get public vehicle details (published only)
  router.get("/:vehicleId", async (request, response, next) => {
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
      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        status: "published",
      }).lean();

      if (!vehicle) {
        throw new HttpError(404, "NOT_FOUND", "Vehicle was not found.");
      }

      return response.status(200).json(formatVehicle(vehicle));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
