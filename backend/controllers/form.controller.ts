import type { Request, Response } from "express";
import { Types } from "mongoose";
import env from "../config/env.ts";
import Form from "../models/Form.ts";
import Submission from "../models/Submission.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { CreateFormInput, UpdateFormInput } from "../schemas/form.schema.ts";

/** Public link a respondent opens. Built from APP_ORIGIN so it works in prod. */
const shareUrl = (formId: unknown) => `${env.APP_ORIGIN}/form/${String(formId)}`;

const withShareUrl = (form: { toObject: () => Record<string, unknown>; _id: unknown }) => ({
  ...form.toObject(),
  shareUrl: shareUrl(form._id),
});

/** Every owner-scoped query goes through this, so one tenant can never read
 *  or mutate another tenant's forms. */
const ownedBy = (req: Request, formId: string) => ({
  _id: new Types.ObjectId(formId),
  userId: new Types.ObjectId(req.user!.id),
});

/** POST /api/forms */
export const createForm = async (
  req: Request<Record<string, string>, unknown, CreateFormInput>,
  res: Response,
) => {
  const { title, description, fields, isActive } = req.body;

  const form = await Form.create({
    userId: new Types.ObjectId(req.user!.id),
    title,
    fields,
    ...(description !== undefined ? { description } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  });

  res.status(201).json({
    success: true,
    message: "Form published",
    data: withShareUrl(form),
  });
};

/** GET /api/forms — only the signed-in user's forms. */
export const listForms = async (req: Request, res: Response) => {
  const forms = await Form.find({ userId: new Types.ObjectId(req.user!.id) }).sort({
    updatedAt: -1,
  });

  res.status(200).json({
    success: true,
    count: forms.length,
    data: forms.map(withShareUrl),
  });
};

/** GET /api/forms/:id — owner view, includes response counts. */
export const getForm = async (req: Request<{ id: string }>, res: Response) => {
  const form = await Form.findOne(ownedBy(req, req.params.id));
  if (!form) throw ApiError.notFound("Form not found");

  res.status(200).json({ success: true, data: withShareUrl(form) });
};

/**
 * GET /api/forms/:id/public — no authentication.
 *
 * This is what the shareable link loads, so it deliberately omits `userId`
 * and every other internal field.
 */
export const getPublicForm = async (req: Request<{ id: string }>, res: Response) => {
  const form = await Form.findById(req.params.id);

  if (!form || !form.isActive) {
    throw ApiError.notFound("This form is not available");
  }

  res.status(200).json({
    success: true,
    data: {
      _id: form._id,
      title: form.title,
      description: form.description,
      fields: form.fields,
    },
  });
};

/** PUT /api/forms/:id */
export const updateForm = async (
  req: Request<{ id: string }, unknown, UpdateFormInput>,
  res: Response,
) => {
  // Only keys actually sent are applied, so a partial update never wipes a
  // field by writing `undefined` over it.
  const updates: Record<string, unknown> = {};
  for (const key of ["title", "description", "fields", "isActive"] as const) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest("Nothing to update");
  }

  const form = await Form.findOneAndUpdate(
    ownedBy(req, req.params.id),
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!form) throw ApiError.notFound("Form not found");

  res.status(200).json({
    success: true,
    message: "Form updated",
    data: withShareUrl(form),
  });
};

/** DELETE /api/forms/:id — removes the form and its responses together. */
export const deleteForm = async (req: Request<{ id: string }>, res: Response) => {
  const form = await Form.findOneAndDelete(ownedBy(req, req.params.id));
  if (!form) throw ApiError.notFound("Form not found");

  await Submission.deleteMany({ formId: form._id });

  res.status(200).json({
    success: true,
    message: "Form deleted",
    data: { id: String(form._id) },
  });
};
