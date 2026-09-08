import mongoose, { Schema, model } from "mongoose";
import type { HydratedDocument, InferSchemaType, Model } from "mongoose";

/**
 * One row per issued refresh token.
 *
 * Rotation: every successful refresh revokes the presented token and issues a
 * new one in the same `family`. If a token that is already revoked is
 * presented again, it means someone replayed a stolen token — the whole
 * family is then revoked so both the attacker and the victim are logged out.
 */
const RefreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    /** SHA-256 of (raw token + pepper). The raw token never touches the DB. */
    tokenHash: { type: String, required: true, unique: true },

    /** Shared by every token descended from one login. */
    family: { type: String, required: true, index: true },

    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },

    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: true },
);

// Mongo removes rows once they expire, so the collection stays small.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IRefreshToken = InferSchemaType<typeof RefreshTokenSchema>;
export type RefreshTokenDocument = HydratedDocument<IRefreshToken>;

const RefreshToken: Model<IRefreshToken> =
  (mongoose.models.RefreshToken as Model<IRefreshToken>) ??
  model<IRefreshToken>("RefreshToken", RefreshTokenSchema);

export default RefreshToken;
