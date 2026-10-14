export function formatVehicle(vehicle) {
  if (!vehicle) return null;

  const doc =
    typeof vehicle.toObject === "function" ? vehicle.toObject() : vehicle;

  const result = {
    id: doc._id ? doc._id.toString() : doc.id,
    make: doc.make,
    model: doc.model,
  };

  if (doc.modelYear !== undefined && doc.modelYear !== null) {
    result.modelYear = doc.modelYear;
  }
  if (doc.variant !== undefined && doc.variant !== null) {
    result.variant = doc.variant;
  }
  if (doc.bodyType !== undefined && doc.bodyType !== null) {
    result.bodyType = doc.bodyType;
  }
  if (doc.fuelType !== undefined && doc.fuelType !== null) {
    result.fuelType = doc.fuelType;
  }
  if (doc.transmission !== undefined && doc.transmission !== null) {
    result.transmission = doc.transmission;
  }
  if (doc.seatingCapacity !== undefined && doc.seatingCapacity !== null) {
    result.seatingCapacity = doc.seatingCapacity;
  }
  if (doc.imageUrl !== undefined && doc.imageUrl !== null) {
    result.imageUrl = doc.imageUrl;
  }
  if (Array.isArray(doc.images) && doc.images.length > 0) {
    result.images = doc.images;
    if (!result.imageUrl) {
      result.imageUrl = doc.images[0];
    }
  } else if (result.imageUrl) {
    result.images = [result.imageUrl];
  }
  if (doc.specifications !== undefined && doc.specifications !== null) {
    result.specifications = doc.specifications;
  }

  if (Array.isArray(doc.prices)) {
    result.prices = doc.prices.map((p) => {
      const amount =
        p.amount && typeof p.amount.toString === "function"
          ? Number(p.amount.toString())
          : Number(p.amount);
      const item = {
        type: p.type,
        amount,
        currency: p.currency,
      };
      if (p.effectiveAt) item.effectiveAt = p.effectiveAt;
      if (p.sourceId) item.sourceId = p.sourceId;
      if (p.verifiedAt) item.verifiedAt = p.verifiedAt;
      return item;
    });
  }

  result.status = doc.status;

  if (Array.isArray(doc.dataSources)) {
    result.dataSources = doc.dataSources.map((s) => {
      const item = {
        provider: s.provider,
        retrievedAt: s.retrievedAt,
      };
      if (s.sourceRecordId) item.sourceRecordId = s.sourceRecordId;
      if (s.sourceUrl) item.sourceUrl = s.sourceUrl;
      if (s.licenseReference) item.licenseReference = s.licenseReference;
      if (s.fieldPaths) item.fieldPaths = s.fieldPaths;
      return item;
    });
  }

  if (doc.verifiedAt) result.verifiedAt = doc.verifiedAt;
  if (doc.verifiedBy) result.verifiedBy = doc.verifiedBy;
  if (doc.createdBy) result.createdBy = doc.createdBy;
  if (doc.updatedBy) result.updatedBy = doc.updatedBy;
  if (doc.createdAt) result.createdAt = doc.createdAt;
  if (doc.updatedAt) result.updatedAt = doc.updatedAt;

  return result;
}
