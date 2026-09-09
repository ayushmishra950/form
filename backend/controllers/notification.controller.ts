import type { Request, Response } from "express";
import { Types } from "mongoose";
import Notification from "../models/Notification.ts";
import { ApiError } from "../utils/ApiError.ts";
import { emitToUser } from "../realtime/io.ts";

const ownerId = (req: Request) => new Types.ObjectId(req.user!.id);

/** Broadcasts the new badge value so every other tab agrees immediately. */
async function syncBadge(userId: Types.ObjectId): Promise<number> {
  const unreadCount = await Notification.countDocuments({ userId, read: false });
  emitToUser(String(userId), "notification:count", { unreadCount });
  return unreadCount;
}

/** GET /api/notifications — latest first, with the current unread count. */
export const listNotifications = async (req: Request, res: Response) => {
  const userId = ownerId(req);

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ userId, read: false }),
  ]);

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: { notifications, unreadCount },
  });
};

/** PATCH /api/notifications/:id/read — marks one as seen. */
export const markRead = async (req: Request<{ id: string }>, res: Response) => {
  const userId = ownerId(req);

  const notification = await Notification.findOneAndUpdate(
    { _id: new Types.ObjectId(req.params.id), userId },
    { $set: { read: true, readAt: new Date() } },
    { new: true },
  );

  if (!notification) throw ApiError.notFound("Notification not found");

  res.status(200).json({
    success: true,
    data: { notification, unreadCount: await syncBadge(userId) },
  });
};

/** POST /api/notifications/read-all — clears the badge in one go. */
export const markAllRead = async (req: Request, res: Response) => {
  const userId = ownerId(req);

  await Notification.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: new Date() } },
  );

  res.status(200).json({
    success: true,
    message: "All caught up",
    data: { unreadCount: await syncBadge(userId) },
  });
};

/** DELETE /api/notifications — clears the list entirely. */
export const clearAll = async (req: Request, res: Response) => {
  const userId = ownerId(req);
  const removed = await Notification.deleteMany({ userId });

  res.status(200).json({
    success: true,
    message: "Notifications cleared",
    data: { removed: removed.deletedCount, unreadCount: await syncBadge(userId) },
  });
};
