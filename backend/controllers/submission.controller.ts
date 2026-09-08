import type { Request, Response } from "express";
import { Types } from "mongoose";
import Form from "../models/Form.ts";
import Submission from "../models/Submission.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { CreateSubmissionInput } from "../schemas/submission.schema.ts";

/**
 * POST /api/forms/:id/submissions — public, no authentication.
 *
 * The owner is copied from the form rather than taken from the request, so a
 * respondent can never attribute a response to someone else.
 */
export const createSubmission = async (
  req: Request<{ id: string }, unknown, CreateSubmissionInput>,
  res: Response,
) => {
  const form = await Form.findById(req.params.id);

  if (!form || !form.isActive) {
    throw ApiError.notFound("This form is not accepting responses");
  }

  const allowedIds = new Set(form.fields.map((field) => field.id));
  const responses: Record<string, string | string[]> = {};

  // Drop anything that is not a real field on this form.
  for (const [fieldId, value] of Object.entries(req.body.responses)) {
    if (allowedIds.has(fieldId)) responses[fieldId] = value;
  }

  const missing = form.fields
    .filter((field) => {
      if (!field.required) return false;
      const value = responses[field.id];
      return Array.isArray(value) ? value.length === 0 : !value?.trim();
    })
    .map((field) => ({ field: field.id, message: `${field.label} is required` }));

  if (missing.length > 0) {
    throw ApiError.badRequest("Some required fields are missing", missing);
  }

  const submission = await Submission.create({
    formId: form._id,
    userId: form.userId,
    responses,
    ip: req.ip ?? null,
  });

  await Form.updateOne({ _id: form._id }, { $inc: { submissionCount: 1 } });

  res.status(201).json({
    success: true,
    message: "Response recorded",
    data: { id: String(submission._id) },
  });
};

/** GET /api/forms/:id/submissions — owner only. */
export const listSubmissions = async (req: Request<{ id: string }>, res: Response) => {
  const form = await Form.findOne({
    _id: new Types.ObjectId(req.params.id),
    userId: new Types.ObjectId(req.user!.id),
  });

  if (!form) throw ApiError.notFound("Form not found");

  const submissions = await Submission.find({ formId: form._id })
    .sort({ createdAt: -1 })
    .limit(500);

  res.status(200).json({
    success: true,
    count: submissions.length,
    data: {
      form: { _id: form._id, title: form.title, fields: form.fields },
      submissions,
    },
  });
};
