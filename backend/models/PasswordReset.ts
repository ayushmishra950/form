import mongoose, { Schema, model } from "mongoose";
import type { HydratedDocument, InferSchemaType, Model } from "mongoose";

/**
 * A short-lived permission to set one account's password.
 *
 * The raw token is handed to the client once and only its hash is stored, so
 * a leaked database cannot be used to reset anyone's password. Tokens are
 * single use and expire quickly.
 */
const PasswordResetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    /** HMAC-SHA256 of the raw token. The raw value never touches the DB. */
    tokenHash: { type: String, required: true, unique: true },

    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },

    requestedIp: { type: String, default: null },
  },
  { timestamps: true },
);

// Mongo drops spent tokens on its own, so the collection stays small.
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IPasswordReset = InferSchemaType<typeof PasswordResetSchema>;
export type PasswordResetDocument = HydratedDocument<IPasswordReset>;

const PasswordReset: Model<IPasswordReset> =
  (mongoose.models.PasswordReset as Model<IPasswordReset>) ??
  model<IPasswordReset>("PasswordReset", PasswordResetSchema);

export default PasswordReset;
