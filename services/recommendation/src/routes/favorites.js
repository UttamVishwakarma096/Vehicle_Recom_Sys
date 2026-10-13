import { Router } from "express";
import { HttpError } from "../foundation.js";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export function createFavoritesRoutes({
  models,
  catalogClient,
  authenticate,
} = {}) {
  const router = Router();

  // All favorite endpoints require authenticated user
  router.use(authenticate());

  // GET /api/v1/favorites
  router.get("/", async (request, response, next) => {
    try {
      let page = 1;
      if (request.query.page !== undefined) {
        const parsed = Number(request.query.page);
        if (!Number.isInteger(parsed) || parsed < 1) {
          throw new HttpError(400, "INVALID_PAGINATION", "Page must be a positive integer >= 1.");
        }
        page = parsed;
      }

      let limit = 20;
      if (request.query.limit !== undefined) {
        const parsed = Number(request.query.limit);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
          throw new HttpError(400, "INVALID_PAGINATION", "Limit must be a positive integer between 1 and 50.");
        }
        limit = parsed;
      }

      const Favorite = models?.Favorite;
      if (!Favorite) {
        throw new HttpError(500, "DATABASE_ERROR", "Favorite model not available.");
      }

      const userId = request.user.id;
      const [favDocs, totalItems] = await Promise.all([
        Favorite.find({ userId })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Favorite.countDocuments({ userId }),
      ]);

      const totalPages = Math.ceil(totalItems / limit) || (totalItems === 0 ? 0 : 1);

      if (favDocs.length === 0) {
        return response.status(200).json({
          items: [],
          pagination: {
            page,
            limit,
            totalItems: 0,
            totalPages: 0,
          },
        });
      }

      const vehicleIds = favDocs.map((f) => f.vehicleId);
      let vehicleMap = new Map();

      if (catalogClient) {
        const lookup = await catalogClient.lookupVehicles(vehicleIds, {
          correlationId: request.correlationId,
        });
        if (lookup?.vehicles) {
          vehicleMap = new Map(lookup.vehicles.map((v) => [v.id, v]));
        }
      }

      const items = favDocs.map((fav) => {
        const vehicle = vehicleMap.get(fav.vehicleId) || null;
        return {
          id: fav._id.toString(),
          vehicleId: fav.vehicleId,
          createdAt: fav.createdAt,
          vehicle,
          status: vehicle ? "published" : "unavailable",
        };
      });

      return response.status(200).json({
        items,
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

  // PUT /api/v1/favorites/:vehicleId
  router.put("/:vehicleId", async (request, response, next) => {
    try {
      const { vehicleId } = request.params;
      if (!vehicleId || !OBJECT_ID_REGEX.test(vehicleId)) {
        throw new HttpError(
          400,
          "INVALID_IDENTIFIER",
          "Vehicle ID must be a valid 24-character hexadecimal identifier.",
        );
      }

      if (!catalogClient) {
        throw new HttpError(
          503,
          "DOWNSTREAM_UNAVAILABLE",
          "Catalog client is not configured.",
        );
      }

      // Verify target vehicle is published
      const lookup = await catalogClient.lookupVehicles([vehicleId], {
        correlationId: request.correlationId,
      });

      if (!lookup?.vehicles?.length || lookup.unavailableIds?.includes(vehicleId)) {
        throw new HttpError(
          404,
          "VEHICLE_NOT_FOUND",
          "Target vehicle does not exist or is not currently published.",
        );
      }

      const Favorite = models?.Favorite;
      if (!Favorite) {
        throw new HttpError(500, "DATABASE_ERROR", "Favorite model not available.");
      }

      const userId = request.user.id;
      const existing = await Favorite.findOne({ userId, vehicleId });

      if (existing) {
        return response.status(200).json({
          message: "Vehicle is already in favorites.",
          vehicleId,
        });
      }

      await Favorite.create({ userId, vehicleId });

      return response.status(201).json({
        message: "Vehicle added to favorites.",
        vehicleId,
      });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/v1/favorites/:vehicleId
  router.delete("/:vehicleId", async (request, response, next) => {
    try {
      const { vehicleId } = request.params;
      if (!vehicleId || !OBJECT_ID_REGEX.test(vehicleId)) {
        throw new HttpError(
          400,
          "INVALID_IDENTIFIER",
          "Vehicle ID must be a valid 24-character hexadecimal identifier.",
        );
      }

      const Favorite = models?.Favorite;
      if (!Favorite) {
        throw new HttpError(500, "DATABASE_ERROR", "Favorite model not available.");
      }

      const userId = request.user.id;
      await Favorite.deleteOne({ userId, vehicleId });

      return response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
