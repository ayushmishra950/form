import mongoose, { Schema, model } from "mongoose";
import type { HydratedDocument, InferSchemaType, Model } from "mongoose";

export const NOTIFICATION_TYPES = [
  "user_registered",
  "feedback_created",
  "feedback_replied",
  "feedback_status",
  "password_changed",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * One row per recipient.
 *
 * Sockets only reach people who are online, so every notification is stored
 * as well — that is what keeps the unread badge correct after a reload, and
 * lets someone catch up on what happened while they were away.
 */
const NotificationSchema = new Schema(
  {
    /** Who should see this. */
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    type: { type: String, required: true, enum: NOTIFICATION_TYPES },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },

    /** In-app route the bell should open when this is clicked. */
    link: { type: String, default: null },

    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },

    /** Who or what triggered it — handy for avatars and de-duplication. */
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: null },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

export type INotification = InferSchemaType<typeof NotificationSchema>;
export type NotificationDocument = HydratedDocument<INotification>;

const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ??
  model<INotification>("Notification", NotificationSchema);

export default Notification;
