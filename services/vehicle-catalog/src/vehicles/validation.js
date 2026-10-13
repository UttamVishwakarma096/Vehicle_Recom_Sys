import {
  ALLOWED_BODY_TYPES,
  ALLOWED_FUEL_TYPES,
  ALLOWED_TRANSMISSIONS,
  ALLOWED_PRICE_TYPES,
  ALLOWED_STATUSES,
} from "../models.js";

const ALLOWED_VEHICLE_KEYS = new Set([
  "make",
  "model",
  "modelYear",
  "variant",
  "bodyType",
  "fuelType",
  "transmission",
  "seatingCapacity",
  "imageUrl",
  "specifications",
  "prices",
  "dataSources",
  "status",
]);

const FORBIDDEN_CLIENT_KEYS = new Set([
  "_id",
  "id",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
  "verifiedBy",
  "verifiedAt",
]);

const ALLOWED_PRICE_KEYS = new Set([
  "type",
  "amount",
  "currency",
  "effectiveAt",
  "sourceId",
  "verifiedAt",
]);

const ALLOWED_SOURCE_KEYS = new Set([
  "provider",
  "sourceRecordId",
  "sourceUrl",
  "licenseReference",
  "retrievedAt",
  "fieldPaths",
]);

export function isValidObjectId(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

function isValidIsoDate(value) {
  if (value instanceof Date) return !isNaN(value.getTime());
  if (typeof value !== "string" && typeof value !== "number") return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateVehiclePayload(body, { isUpdate = false } = {}) {
  const fieldErrors = [];

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return [
      {
        field: "body",
        code: "INVALID_FORMAT",
        message: "Request body must be a JSON object.",
      },
    ];
  }

  // Check for forbidden / protected fields
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_CLIENT_KEYS.has(key)) {
      fieldErrors.push({
        field: key,
        code: "PROTECTED_FIELD",
        message: `Field '${key}' is protected and cannot be set directly.`,
      });
    } else if (!ALLOWED_VEHICLE_KEYS.has(key)) {
      fieldErrors.push({
        field: key,
        code: "UNRECOGNIZED_FIELD",
        message: `Field '${key}' is not an allowed catalog field.`,
      });
    }
  }

  if (isUpdate && body.status !== undefined) {
    fieldErrors.push({
      field: "status",
      code: "PROTECTED_FIELD",
      message:
        "Vehicle status cannot be changed here; use PATCH /api/v1/admin/vehicles/:vehicleId/status.",
    });
  }

  // Make
  if (!isUpdate && (body.make === undefined || body.make === null)) {
    fieldErrors.push({
      field: "make",
      code: "REQUIRED_FIELD",
      message: "Make is required.",
    });
  } else if (body.make !== undefined) {
    if (typeof body.make !== "string" || body.make.trim().length === 0) {
      fieldErrors.push({
        field: "make",
        code: "INVALID_VALUE",
        message: "Make must be a non-empty string.",
      });
    }
  }

  // Model
  if (!isUpdate && (body.model === undefined || body.model === null)) {
    fieldErrors.push({
      field: "model",
      code: "REQUIRED_FIELD",
      message: "Model is required.",
    });
  } else if (body.model !== undefined) {
    if (typeof body.model !== "string" || body.model.trim().length === 0) {
      fieldErrors.push({
        field: "model",
        code: "INVALID_VALUE",
        message: "Model must be a non-empty string.",
      });
    }
  }

  // ModelYear
  if (body.modelYear !== undefined && body.modelYear !== null) {
    if (
      typeof body.modelYear !== "number" ||
      !Number.isInteger(body.modelYear) ||
      body.modelYear < 1900 ||
      body.modelYear > 2100
    ) {
      fieldErrors.push({
        field: "modelYear",
        code: "INVALID_VALUE",
        message: "Model year must be an integer between 1900 and 2100.",
      });
    }
  }

  // Variant
  if (body.variant !== undefined && body.variant !== null) {
    if (typeof body.variant !== "string" || body.variant.trim().length === 0) {
      fieldErrors.push({
        field: "variant",
        code: "INVALID_VALUE",
        message: "Variant must be a non-empty string when provided.",
      });
    }
  }

  // BodyType
  if (body.bodyType !== undefined && body.bodyType !== null) {
    if (!ALLOWED_BODY_TYPES.includes(body.bodyType)) {
      fieldErrors.push({
        field: "bodyType",
        code: "INVALID_VALUE",
        message: `Body type must be one of: ${ALLOWED_BODY_TYPES.join(", ")}.`,
      });
    }
  }

  // FuelType
  if (body.fuelType !== undefined && body.fuelType !== null) {
    if (!ALLOWED_FUEL_TYPES.includes(body.fuelType)) {
      fieldErrors.push({
        field: "fuelType",
        code: "INVALID_VALUE",
        message: `Fuel type must be one of: ${ALLOWED_FUEL_TYPES.join(", ")}.`,
      });
    }
  }

  // Transmission
  if (body.transmission !== undefined && body.transmission !== null) {
    if (!ALLOWED_TRANSMISSIONS.includes(body.transmission)) {
      fieldErrors.push({
        field: "transmission",
        code: "INVALID_VALUE",
        message: `Transmission must be one of: ${ALLOWED_TRANSMISSIONS.join(", ")}.`,
      });
    }
  }

  // SeatingCapacity
  if (body.seatingCapacity !== undefined && body.seatingCapacity !== null) {
    if (
      typeof body.seatingCapacity !== "number" ||
      !Number.isInteger(body.seatingCapacity) ||
      body.seatingCapacity < 1
    ) {
      fieldErrors.push({
        field: "seatingCapacity",
        code: "INVALID_VALUE",
        message:
          "Seating capacity must be a positive integer greater than or equal to 1.",
      });
    }
  }

  // ImageUrl
  if (body.imageUrl !== undefined && body.imageUrl !== null) {
    if (
      typeof body.imageUrl !== "string" ||
      body.imageUrl.trim().length === 0 ||
      (!isValidHttpUrl(body.imageUrl) && !body.imageUrl.startsWith("/"))
    ) {
      fieldErrors.push({
        field: "imageUrl",
        code: "INVALID_VALUE",
        message: "Image URL must be a non-empty valid URL or relative path.",
      });
    }
  }

  // Specifications
  if (body.specifications !== undefined && body.specifications !== null) {
    if (
      typeof body.specifications !== "object" ||
      Array.isArray(body.specifications)
    ) {
      fieldErrors.push({
        field: "specifications",
        code: "INVALID_FORMAT",
        message: "Specifications must be an object.",
      });
    }
  }

  // Prices
  if (body.prices !== undefined && body.prices !== null) {
    if (!Array.isArray(body.prices)) {
      fieldErrors.push({
        field: "prices",
        code: "INVALID_FORMAT",
        message: "Prices must be an array.",
      });
    } else {
      body.prices.forEach((price, index) => {
        if (
          typeof price !== "object" ||
          price === null ||
          Array.isArray(price)
        ) {
          fieldErrors.push({
            field: `prices[${index}]`,
            code: "INVALID_FORMAT",
            message: `Price at index ${index} must be an object.`,
          });
          return;
        }

        for (const k of Object.keys(price)) {
          if (!ALLOWED_PRICE_KEYS.has(k)) {
            fieldErrors.push({
              field: `prices[${index}].${k}`,
              code: "UNRECOGNIZED_FIELD",
              message: `Field '${k}' is not allowed in price objects.`,
            });
          }
        }

        if (!price.type || !ALLOWED_PRICE_TYPES.includes(price.type)) {
          fieldErrors.push({
            field: `prices[${index}].type`,
            code: "INVALID_VALUE",
            message: `Price type must be one of: ${ALLOWED_PRICE_TYPES.join(", ")}.`,
          });
        }

        if (
          price.amount === undefined ||
          typeof price.amount !== "number" ||
          !Number.isFinite(price.amount) ||
          price.amount <= 0
        ) {
          fieldErrors.push({
            field: `prices[${index}].amount`,
            code: "INVALID_VALUE",
            message: `Price amount must be a finite positive number greater than zero.`,
          });
        }

        if (price.currency !== "INR") {
          fieldErrors.push({
            field: `prices[${index}].currency`,
            code: "INVALID_VALUE",
            message: `Price currency must be 'INR'.`,
          });
        }

        if (
          price.effectiveAt !== undefined &&
          !isValidIsoDate(price.effectiveAt)
        ) {
          fieldErrors.push({
            field: `prices[${index}].effectiveAt`,
            code: "INVALID_VALUE",
            message: "effectiveAt must be a valid ISO date.",
          });
        }

        if (
          price.verifiedAt !== undefined &&
          !isValidIsoDate(price.verifiedAt)
        ) {
          fieldErrors.push({
            field: `prices[${index}].verifiedAt`,
            code: "INVALID_VALUE",
            message: "verifiedAt must be a valid ISO date.",
          });
        }
      });
    }
  }

  // DataSources
  if (body.dataSources !== undefined && body.dataSources !== null) {
    if (!Array.isArray(body.dataSources)) {
      fieldErrors.push({
        field: "dataSources",
        code: "INVALID_FORMAT",
        message: "dataSources must be an array.",
      });
    } else {
      body.dataSources.forEach((source, index) => {
        if (
          typeof source !== "object" ||
          source === null ||
          Array.isArray(source)
        ) {
          fieldErrors.push({
            field: `dataSources[${index}]`,
            code: "INVALID_FORMAT",
            message: `DataSource at index ${index} must be an object.`,
          });
          return;
        }

        for (const k of Object.keys(source)) {
          if (!ALLOWED_SOURCE_KEYS.has(k)) {
            fieldErrors.push({
              field: `dataSources[${index}].${k}`,
              code: "UNRECOGNIZED_FIELD",
              message: `Field '${k}' is not allowed in dataSource objects.`,
            });
          }
        }

        if (
          !source.provider ||
          typeof source.provider !== "string" ||
          source.provider.trim().length === 0
        ) {
          fieldErrors.push({
            field: `dataSources[${index}].provider`,
            code: "REQUIRED_FIELD",
            message: `Provider is required and must be a non-empty string.`,
          });
        }

        if (!source.retrievedAt || !isValidIsoDate(source.retrievedAt)) {
          fieldErrors.push({
            field: `dataSources[${index}].retrievedAt`,
            code: "REQUIRED_FIELD",
            message: `retrievedAt is required and must be a valid ISO date.`,
          });
        }

        if (
          source.sourceUrl !== undefined &&
          !isValidHttpUrl(source.sourceUrl)
        ) {
          fieldErrors.push({
            field: `dataSources[${index}].sourceUrl`,
            code: "INVALID_VALUE",
            message: `sourceUrl must be a valid HTTP or HTTPS URL.`,
          });
        }

        if (
          source.fieldPaths !== undefined &&
          (!Array.isArray(source.fieldPaths) ||
            source.fieldPaths.some((p) => typeof p !== "string"))
        ) {
          fieldErrors.push({
            field: `dataSources[${index}].fieldPaths`,
            code: "INVALID_FORMAT",
            message: `fieldPaths must be an array of strings.`,
          });
        }
      });
    }
  }

  // Status on create
  if (!isUpdate && body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      fieldErrors.push({
        field: "status",
        code: "INVALID_VALUE",
        message: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}.`,
      });
    }
  }

  return fieldErrors;
}

export function validatePublicationPreconditions(vehicle) {
  const errors = [];

  if (
    !vehicle.make ||
    typeof vehicle.make !== "string" ||
    vehicle.make.trim().length === 0
  ) {
    errors.push({
      field: "make",
      code: "REQUIRED_FIELD",
      message: "Vehicle make is required for publication.",
    });
  }

  if (
    !vehicle.model ||
    typeof vehicle.model !== "string" ||
    vehicle.model.trim().length === 0
  ) {
    errors.push({
      field: "model",
      code: "REQUIRED_FIELD",
      message: "Vehicle model is required for publication.",
    });
  }

  if (!Array.isArray(vehicle.prices) || vehicle.prices.length === 0) {
    errors.push({
      field: "prices",
      code: "MISSING_PRICE",
      message:
        "Vehicle must have at least one valid price record to be published.",
    });
  } else {
    const validPrice = vehicle.prices.some(
      (p) =>
        p &&
        ALLOWED_PRICE_TYPES.includes(p.type) &&
        p.currency === "INR" &&
        Number(p.amount.toString()) > 0,
    );
    if (!validPrice) {
      errors.push({
        field: "prices",
        code: "INVALID_PRICE",
        message:
          "Vehicle must contain at least one valid INR price with positive amount.",
      });
    }
  }

  if (!Array.isArray(vehicle.dataSources) || vehicle.dataSources.length === 0) {
    errors.push({
      field: "dataSources",
      code: "MISSING_PROVENANCE",
      message:
        "Vehicle must have at least one valid data provenance record to be published.",
    });
  } else {
    const validSource = vehicle.dataSources.some(
      (s) =>
        s &&
        s.provider &&
        s.provider.trim().length > 0 &&
        isValidIsoDate(s.retrievedAt),
    );
    if (!validSource) {
      errors.push({
        field: "dataSources",
        code: "INVALID_PROVENANCE",
        message:
          "Vehicle must contain at least one valid provenance record with provider and retrieval date.",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
