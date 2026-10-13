import mongoose from "mongoose";

const { Schema } = mongoose;

export const ALLOWED_BODY_TYPES = [
  "hatchback",
  "sedan",
  "suv",
  "muv",
  "coupe",
  "convertible",
  "wagon",
  "pickup",
];

export const ALLOWED_FUEL_TYPES = [
  "petrol",
  "diesel",
  "cng",
  "electric",
  "hybrid",
  "lpg",
];

export const ALLOWED_TRANSMISSIONS = ["manual", "automatic"];

export const ALLOWED_PRICE_TYPES = ["ex_showroom", "on_road", "used"];

export const ALLOWED_STATUSES = ["draft", "published", "unpublished"];

export function registerModels(connection) {
  const priceSchema = new Schema(
    {
      type: { type: String, enum: ALLOWED_PRICE_TYPES, required: true },
      amount: {
        type: Schema.Types.Decimal128,
        required: true,
        validate: {
          validator: (value) => value != null && Number(value.toString()) > 0,
          message: "Price amount must be greater than zero.",
        },
      },
      currency: { type: String, enum: ["INR"], required: true },
      effectiveAt: Date,
      sourceId: String,
      verifiedAt: Date,
    },
    { _id: false, strict: "throw" },
  );

  const sourceSchema = new Schema(
    {
      provider: { type: String, required: true, trim: true, minlength: 1 },
      sourceRecordId: String,
      sourceUrl: String,
      licenseReference: String,
      retrievedAt: { type: Date, required: true },
      fieldPaths: [String],
    },
    { _id: false, strict: "throw" },
  );

  const vehicleSchema = new Schema(
    {
      make: { type: String, required: true, trim: true, minlength: 1 },
      model: { type: String, required: true, trim: true, minlength: 1 },
      modelYear: {
        type: Number,
        validate: {
          validator: (value) =>
            value === undefined ||
            (Number.isInteger(value) && value >= 1900 && value <= 2100),
          message: "Model year must be an integer between 1900 and 2100.",
        },
      },
      variant: { type: String, trim: true },
      bodyType: { type: String, enum: ALLOWED_BODY_TYPES },
      fuelType: { type: String, enum: ALLOWED_FUEL_TYPES },
      transmission: { type: String, enum: ALLOWED_TRANSMISSIONS },
      seatingCapacity: {
        type: Number,
        min: 1,
        validate: {
          validator: (value) => value === undefined || Number.isInteger(value),
          message: "Seating capacity must be a positive integer.",
        },
      },
      imageUrl: { type: String, trim: true },
      specifications: { type: Schema.Types.Mixed, default: undefined },
      prices: { type: [priceSchema], default: undefined },
      status: {
        type: String,
        enum: ALLOWED_STATUSES,
        default: "draft",
        required: true,
      },
      dataSources: { type: [sourceSchema], default: undefined },
      verifiedAt: Date,
      verifiedBy: String,
      createdBy: { type: String, required: true },
      updatedBy: String,
    },
    { timestamps: true, strict: "throw", collection: "vehicles" },
  );

  vehicleSchema.index({ status: 1, make: 1, model: 1, modelYear: -1 });
  vehicleSchema.index({ status: 1, bodyType: 1, fuelType: 1, transmission: 1 });
  vehicleSchema.index({ status: 1, "prices.type": 1, "prices.amount": 1 });

  return { Vehicle: connection.model("Vehicle", vehicleSchema) };
}
