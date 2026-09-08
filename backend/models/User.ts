import mongoose, { Schema, model } from "mongoose";
import type { HydratedDocument, InferSchemaType, Model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // already creates the index — no separate schema.index() call
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },

    /** An admin can suspend an account without removing anything. */
    isActive: { type: Boolean, default: true },

    /**
     * Soft delete. The row is kept so the person still gets a clear
     * "your account was deleted" message when they try to sign in; an admin
     * can restore it, or purge it permanently.
     */
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

export type IUser = InferSchemaType<typeof UserSchema>;
export type UserDocument = HydratedDocument<IUser>;

/** Why a user cannot sign in, or null when the account is fine. */
export function accountBlockReason(user: {
  isActive?: boolean | null;
  deletedAt?: Date | null;
}): string | null {
  if (user.deletedAt) {
    return "Your account has been deleted. Please contact the admin.";
  }
  if (user.isActive === false) {
    return "Your account has been deactivated. Please contact the admin.";
  }
  return null;
}

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ?? model<IUser>("User", UserSchema);

export default User;
