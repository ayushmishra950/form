import { Types } from "mongoose";
import Notification from "../models/Notification.ts";
import type { NotificationDocument, NotificationType } from "../models/Notification.ts";
import User from "../models/User.ts";
import { emitToUser } from "../realtime/io.ts";

interface NotifyInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  actorId?: Types.ObjectId | string | null;
  actorName?: string | null;
}

/** Shape the client receives on the wire and renders in the bell. */
const wireFormat = (doc: NotificationDocument) => ({
  _id: String(doc._id),
  type: doc.type,
  title: doc.title,
  body: doc.body,
  link: doc.link ?? null,
  read: doc.read,
  actorName: doc.actorName ?? null,
  createdAt: doc.createdAt,
});

/**
 * Stores a notification and pushes it to that user's open tabs.
 *
 * Storing first means the badge is still right when nobody was connected;
 * the socket emit is the live layer on top, never the source of truth.
 */
export async function notifyUser(
  userId: Types.ObjectId | string,
  input: NotifyInput,
): Promise<void> {
  const created = await Notification.create({
    userId: new Types.ObjectId(String(userId)),
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? null,
    actorId: input.actorId ? new Types.ObjectId(String(input.actorId)) : null,
    actorName: input.actorName ?? null,
  });

  const unreadCount = await Notification.countDocuments({
    userId: created.userId,
    read: false,
  });

  emitToUser(String(userId), "notification:new", {
    notification: wireFormat(created),
    unreadCount,
  });
}

/**
 * Same, for every admin on the platform.
 *
 * `exceptUserId` skips the admin who caused the event — nobody needs a
 * notification about their own action.
 */
export async function notifyAdmins(
  input: NotifyInput,
  exceptUserId?: Types.ObjectId | string | null,
): Promise<void> {
  const filter: Record<string, unknown> = {
    role: "admin",
    deletedAt: null,
    isActive: true,
  };
  if (exceptUserId) {
    filter._id = { $ne: new Types.ObjectId(String(exceptUserId)) };
  }

  const admins = await User.find(filter).select("_id");

  // Sequential on purpose: the admin count is small, and this keeps the
  // per-recipient unread count accurate.
  for (const admin of admins) {
    await notifyUser(admin._id as Types.ObjectId, input);
  }
}
