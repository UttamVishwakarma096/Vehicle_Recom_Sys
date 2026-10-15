import mongoose from "mongoose";

const { Schema } = mongoose;

export function registerModels(connection) {
  const userSchema = new Schema(
    {
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      passwordHash: { type: String, required: true, select: false },
      role: { type: String, enum: ["user", "admin"], default: "user", required: true },
      isBlocked: { type: Boolean, default: false, required: true },
      profile: { type: Schema.Types.Mixed, default: undefined },
      preferences: { type: Schema.Types.Mixed, default: () => ({}) },
    },
    { timestamps: true, strict: "throw", collection: "users" },
  );
  userSchema.index({ email: 1 }, { unique: true });

  const sessionSchema = new Schema(
    {
      userId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
      tokenHash: { type: String, required: true, unique: true },
      csrfToken: { type: String, required: true },
      expiresAt: { type: Date, required: true, index: { expires: 0 } },
    },
    { timestamps: true, strict: "throw", collection: "sessions" },
  );

  return {
    User: connection.model("User", userSchema),
    Session: connection.model("Session", sessionSchema),
  };
}
