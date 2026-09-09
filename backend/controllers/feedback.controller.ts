import type { Request, Response } from "express";
import { Types } from "mongoose";
import Feedback from "../models/Feedback.ts";
import User from "../models/User.ts";
import { ApiError } from "../utils/ApiError.ts";
import { notifyAdmins, notifyUser } from "../services/notify.ts";
import type {
  CreateFeedbackInput,
  UpdateFeedbackInput,
} from "../schemas/feedback.schema.ts";

/* ------------------------------------------------------------------ *
 * User side — anyone signed in can raise feedback or report a problem
 * ------------------------------------------------------------------ */

/** POST /api/feedback */
export const createFeedback = async (
  req: Request<Record<string, string>, unknown, CreateFeedbackInput>,
  res: Response,
) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.unauthorized("Account no longer exists");

  const entry = await Feedback.create({
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    type: req.body.type,
    subject: req.body.subject,
    message: req.body.message,
  });

  const isProblem = req.body.type === "problem";

  await notifyAdmins({
    type: "feedback_created",
    title: isProblem ? "New problem reported" : "New feedback received",
    body: `${user.name}: ${entry.subject}`,
    link: "/admin/feedback",
    actorId: user._id as never,
    actorName: user.name,
  });

  res.status(201).json({
    success: true,
    message: isProblem
      ? "Problem reported — the admin team will look into it."
      : "Thanks for the feedback!",
    data: entry,
  });
};

/**
 * GET /api/feedback/mine
 *
 * Only the caller's own submissions. Nothing here exposes another user's
 * feedback — the full queue lives behind the admin routes.
 */
export const listMyFeedback = async (req: Request, res: Response) => {
  const entries = await Feedback.find({
    userId: new Types.ObjectId(req.user!.id),
  })
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, count: entries.length, data: entries });
};

/** DELETE /api/feedback/:id — a user may withdraw their own, while it is open. */
export const deleteMyFeedback = async (req: Request<{ id: string }>, res: Response) => {
  const entry = await Feedback.findOne({
    _id: new Types.ObjectId(req.params.id),
    userId: new Types.ObjectId(req.user!.id),
  });

  if (!entry) throw ApiError.notFound("Feedback not found");
  if (entry.status !== "open") {
    throw ApiError.badRequest("The admin team is already working on this one");
  }

  await entry.deleteOne();

  res.status(200).json({
    success: true,
    message: "Withdrawn",
    data: { id: String(entry._id) },
  });
};

/* ------------------------------------------------------------------ *
 * Admin side — mounted under /api/admin, so every route here is
 * already behind authenticate + requireRole("admin")
 * ------------------------------------------------------------------ */


/** Human wording for a status, used in the notification body. */
const STATUS_WORDING: Record<string, string> = {
  open: "reopened",
  in_review: "moved to in review",
  resolved: "marked resolved",
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** GET /api/admin/feedback */
export const listAllFeedback = async (req: Request, res: Response) => {
  const query = req.query as {
    search?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  };

  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  const filter: Record<string, unknown> = {};
  if (query.status && query.status !== "all") filter.status = query.status;
  if (query.type && query.type !== "all") filter.type = query.type;

  if (query.search?.trim()) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [
      { subject: pattern },
      { message: pattern },
      { userName: pattern },
      { userEmail: pattern },
    ];
  }

  const [entries, total, openCount] = await Promise.all([
    Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Feedback.countDocuments(filter),
    Feedback.countDocuments({ status: "open" }),
  ]);

  res.status(200).json({
    success: true,
    count: entries.length,
    data: {
      feedback: entries,
      total,
      openCount,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  });
};

/** PATCH /api/admin/feedback/:id — change the status and/or reply. */
export const updateFeedback = async (
  req: Request<{ id: string }, unknown, UpdateFeedbackInput>,
  res: Response,
) => {
  const entry = await Feedback.findById(req.params.id);
  if (!entry) throw ApiError.notFound("Feedback not found");

  if (req.body.status !== undefined) {
    entry.status = req.body.status;
    entry.resolvedAt = req.body.status === "resolved" ? new Date() : null;
  }
  if (req.body.adminNote !== undefined) {
    entry.adminNote = req.body.adminNote || null;
  }

  await entry.save();

  // Tell the author what the admin team did with their message.
  const statusChanged = req.body.status !== undefined;
  const replied = req.body.adminNote !== undefined && Boolean(entry.adminNote);

  if (replied || statusChanged) {
    await notifyUser(entry.userId, {
      type: replied ? "feedback_replied" : "feedback_status",
      title: replied
        ? "The admin team replied to you"
        : `Your ${entry.type === "problem" ? "report" : "feedback"} was ${
            STATUS_WORDING[entry.status] ?? "updated"
          }`,
      body: replied ? `“${entry.subject}” — ${entry.adminNote}` : `“${entry.subject}”`,
      link: "/dashboard",
      actorId: req.user?.id ?? null,
      actorName: "Admin team",
    });
  }

  res.status(200).json({ success: true, message: "Updated", data: entry });
};

/** DELETE /api/admin/feedback/:id */
export const deleteFeedback = async (req: Request<{ id: string }>, res: Response) => {
  const entry = await Feedback.findByIdAndDelete(req.params.id);
  if (!entry) throw ApiError.notFound("Feedback not found");

  res.status(200).json({
    success: true,
    message: "Feedback deleted",
    data: { id: String(entry._id) },
  });
};
