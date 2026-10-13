import mongoose from "mongoose";

const { Schema } = mongoose;

export function registerModels(connection) {
  const favoriteSchema = new Schema(
    {
      userId: { type: String, required: true, trim: true },
      vehicleId: { type: String, required: true, trim: true },
    },
    { timestamps: true, strict: "throw", collection: "favorites" },
  );
  favoriteSchema.index({ userId: 1, vehicleId: 1 }, { unique: true });
  favoriteSchema.index({ userId: 1, createdAt: -1 });

  return { Favorite: connection.model("Favorite", favoriteSchema) };
}
