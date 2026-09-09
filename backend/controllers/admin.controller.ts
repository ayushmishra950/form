import type { Request, Response } from "express";
import { Types } from "mongoose";
import Form from "../models/Form.ts";
import Submission from "../models/Submission.ts";
import Feedback from "../models/Feedback.ts";
import User from "../models/User.ts";
import RefreshToken from "../models/RefreshToken.ts";
import { ApiError } from "../utils/ApiError.ts";
import { revokeAllUserTokens } from "../utils/tokens.ts";

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Parsed list query — validated upstream, so the casts are safe. */
const readListQuery = (req: Request) => {
  const query = req.query as {
    search?: string;
    status?: "all" | "active" | "inactive" | "deleted";
    page?: number;
    limit?: number;
  };
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  return {
    search: query.search?.trim() ?? "",
    status: query.status ?? "all",
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

/** Escapes a user-supplied search term before it becomes a RegExp. */
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Counts related documents without loading them into memory. */
const countLookup = (from: string, as: string) => ({
  $lookup: {
    from,
    let: { ownerId: "$_id" },
    pipeline: [
      { $match: { $expr: { $eq: ["$userId", "$$ownerId"] } } },
      { $count: "total" },
    ],
    as,
  },
});

const firstCount = (field: string) => ({
  $ifNull: [{ $arrayElemAt: [`$${field}.total`, 0] }, 0],
});

/** Stops an admin from locking themselves out of the panel. */
const rejectSelfAction = (req: Request, targetId: string, action: string) => {
  if (req.user?.id === targetId) {
    throw ApiError.badRequest(`You cannot ${action} your own account`);
  }
};

/* ------------------------------------------------------------------ *
 * GET /api/admin/stats
 * ------------------------------------------------------------------ */

export const getStats = async (_req: Request, res: Response) => {
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    deletedUsers,
    adminUsers,
    totalForms,
    liveForms,
    totalResponses,
    newUsersThisWeek,
    responsesThisWeek,
    openFeedback,
    totalFeedback,
  ] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    User.countDocuments({ deletedAt: null, isActive: true }),
    User.countDocuments({ deletedAt: null, isActive: false }),
    User.countDocuments({ deletedAt: { $ne: null } }),
    User.countDocuments({ deletedAt: null, role: "admin" }),
    Form.countDocuments({}),
    Form.countDocuments({ isActive: true }),
    Submission.countDocuments({}),
    User.countDocuments({
      deletedAt: null,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    Submission.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    Feedback.countDocuments({ status: "open" }),
    Feedback.countDocuments({}),
  ]);

  // The busiest forms, with their owner attached.
  const topForms = await Form.aggregate([
    { $sort: { submissionCount: -1, createdAt: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $project: {
        title: 1,
        isActive: 1,
        submissionCount: 1,
        fieldCount: { $size: { $ifNull: ["$fields", []] } },
        createdAt: 1,
        ownerName: { $arrayElemAt: ["$owner.name", 0] },
        ownerEmail: { $arrayElemAt: ["$owner.email", 0] },
      },
    },
  ]);

  const recentUsers = await User.find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("name email role isActive createdAt");

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        deleted: deletedUsers,
        admins: adminUsers,
        newThisWeek: newUsersThisWeek,
      },
      forms: { total: totalForms, live: liveForms },
      responses: { total: totalResponses, thisWeek: responsesThisWeek },
      feedback: { open: openFeedback, total: totalFeedback },
      topForms,
      recentUsers,
    },
  });
};

/* ------------------------------------------------------------------ *
 * Users
 * ------------------------------------------------------------------ */

/** GET /api/admin/users */
export const listUsers = async (req: Request, res: Response) => {
  const { search, status, page, limit, skip } = readListQuery(req);

  const match: Record<string, unknown> = {};

  if (status === "deleted") match.deletedAt = { $ne: null };
  else if (status === "active") Object.assign(match, { deletedAt: null, isActive: true });
  else if (status === "inactive")
    Object.assign(match, { deletedAt: null, isActive: false });
  else match.deletedAt = null;

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    match.$or = [{ name: pattern }, { email: pattern }];
  }

  const [rows, total] = await Promise.all([
    User.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      countLookup("forms", "formStats"),
      countLookup("submissions", "responseStats"),
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          isActive: 1,
          deletedAt: 1,
          createdAt: 1,
          formCount: firstCount("formStats"),
          responseCount: firstCount("responseStats"),
        },
      },
    ]),
    User.countDocuments(match),
  ]);

  res.status(200).json({
    success: true,
    count: rows.length,
    data: { users: rows, total, page, limit, pages: Math.ceil(total / limit) || 1 },
  });
};

/** GET /api/admin/users/:id — profile plus every form the user owns. */
export const getUser = async (req: Request<{ id: string }>, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  const forms = await Form.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .select("title description isActive submissionCount createdAt fields");

  const responseCount = await Submission.countDocuments({ userId: user._id });
  const feedbackCount = await Feedback.countDocuments({ userId: user._id });
  const activeSessions = await RefreshToken.countDocuments({
    userId: user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  res.status(200).json({
    success: true,
    data: {
      user,
      forms: forms.map((form) => ({
        _id: form._id,
        title: form.title,
        description: form.description,
        isActive: form.isActive,
        submissionCount: form.submissionCount,
        fieldCount: form.fields?.length ?? 0,
        createdAt: form.createdAt,
      })),
      stats: { formCount: forms.length, responseCount, feedbackCount, activeSessions },
    },
  });
};

/**
 * PATCH /api/admin/users/:id/status
 *
 * Suspending a user also revokes their refresh tokens, so open tabs cannot
 * quietly keep the session alive.
 */
export const updateUserStatus = async (
  req: Request<{ id: string }, unknown, { isActive: boolean }>,
  res: Response,
) => {
  rejectSelfAction(req, req.params.id, "deactivate");

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  if (user.deletedAt) throw ApiError.badRequest("Restore the account first");

  user.isActive = req.body.isActive;
  await user.save();

  if (!req.body.isActive) {
    await revokeAllUserTokens(user._id as Types.ObjectId);
  }

  res.status(200).json({
    success: true,
    message: req.body.isActive ? "Account reactivated" : "Account deactivated",
    data: { user },
  });
};

/** PATCH /api/admin/users/:id/role */
export const updateUserRole = async (
  req: Request<{ id: string }, unknown, { role: "admin" | "user" }>,
  res: Response,
) => {
  rejectSelfAction(req, req.params.id, "change the role of");

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  user.role = req.body.role;
  await user.save();

  res.status(200).json({
    success: true,
    message: `Role updated to ${req.body.role}`,
    data: { user },
  });
};

/**
 * DELETE /api/admin/users/:id — soft delete.
 *
 * The row survives so the person sees a clear message at sign-in, their forms
 * stop accepting responses, and an admin can undo it.
 */
export const softDeleteUser = async (req: Request<{ id: string }>, res: Response) => {
  rejectSelfAction(req, req.params.id, "delete");

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  if (user.deletedAt) throw ApiError.badRequest("Account is already deleted");

  user.deletedAt = new Date();
  user.isActive = false;
  await user.save();

  await Promise.all([
    revokeAllUserTokens(user._id as Types.ObjectId),
    // Their public links stop collecting responses straight away.
    Form.updateMany({ userId: user._id }, { $set: { isActive: false } }),
  ]);

  res.status(200).json({
    success: true,
    message: "Account deleted",
    data: { user },
  });
};

/** POST /api/admin/users/:id/restore */
export const restoreUser = async (req: Request<{ id: string }>, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  if (!user.deletedAt) throw ApiError.badRequest("Account is not deleted");

  user.deletedAt = null;
  user.isActive = true;
  await user.save();

  await Form.updateMany({ userId: user._id }, { $set: { isActive: true } });

  res.status(200).json({
    success: true,
    message: "Account restored",
    data: { user },
  });
};

/** DELETE /api/admin/users/:id/purge — irreversible, removes everything. */
export const purgeUser = async (req: Request<{ id: string }>, res: Response) => {
  rejectSelfAction(req, req.params.id, "permanently delete");

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  const [forms, submissions] = await Promise.all([
    Form.deleteMany({ userId: user._id }),
    Submission.deleteMany({ userId: user._id }),
  ]);
  await Promise.all([
    RefreshToken.deleteMany({ userId: user._id }),
    Feedback.deleteMany({ userId: user._id }),
  ]);
  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: "Account and all its data permanently deleted",
    data: {
      id: String(user._id),
      formsRemoved: forms.deletedCount,
      responsesRemoved: submissions.deletedCount,
    },
  });
};

/* ------------------------------------------------------------------ *
 * Forms
 * ------------------------------------------------------------------ */

/** GET /api/admin/forms — every form on the platform, with its owner. */
export const listAllForms = async (req: Request, res: Response) => {
  const { search, status, page, limit, skip } = readListQuery(req);

  const match: Record<string, unknown> = {};
  if (status === "active") match.isActive = true;
  else if (status === "inactive") match.isActive = false;
  if (search) match.title = new RegExp(escapeRegex(search), "i");

  const [rows, total] = await Promise.all([
    Form.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          isActive: 1,
          submissionCount: 1,
          createdAt: 1,
          userId: 1,
          fieldCount: { $size: { $ifNull: ["$fields", []] } },
          ownerName: { $arrayElemAt: ["$owner.name", 0] },
          ownerEmail: { $arrayElemAt: ["$owner.email", 0] },
        },
      },
    ]),
    Form.countDocuments(match),
  ]);

  res.status(200).json({
    success: true,
    count: rows.length,
    data: { forms: rows, total, page, limit, pages: Math.ceil(total / limit) || 1 },
  });
};

/** PATCH /api/admin/forms/:id/status — take a form offline without deleting it. */
export const updateFormStatus = async (
  req: Request<{ id: string }, unknown, { isActive: boolean }>,
  res: Response,
) => {
  const form = await Form.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: req.body.isActive } },
    { new: true },
  );
  if (!form) throw ApiError.notFound("Form not found");

  res.status(200).json({
    success: true,
    message: req.body.isActive ? "Form is live again" : "Form taken offline",
    data: { form },
  });
};

/** DELETE /api/admin/forms/:id */
export const deleteAnyForm = async (req: Request<{ id: string }>, res: Response) => {
  const form = await Form.findByIdAndDelete(req.params.id);
  if (!form) throw ApiError.notFound("Form not found");

  const removed = await Submission.deleteMany({ formId: form._id });

  res.status(200).json({
    success: true,
    message: "Form deleted",
    data: { id: String(form._id), responsesRemoved: removed.deletedCount },
  });
};
