import { z } from "zod";
import { FEEDBACK_STATUSES, FEEDBACK_TYPES } from "../models/Feedback.ts";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Not a valid id");

export const createFeedbackSchema = z.object({
  body: z.object({
    type: z.enum(FEEDBACK_TYPES),
    subject: z
      .string()
      .trim()
      .min(4, "Give it a short subject")
      .max(120, "Keep the subject under 120 characters"),
    message: z
      .string()
      .trim()
      .min(10, "Tell us a bit more — at least 10 characters")
      .max(2000, "Keep it under 2000 characters"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const listFeedbackSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(["all", ...FEEDBACK_STATUSES]).default("all"),
    type: z.enum(["all", ...FEEDBACK_TYPES]).default("all"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const updateFeedbackSchema = z.object({
  body: z
    .object({
      status: z.enum(FEEDBACK_STATUSES).optional(),
      adminNote: z.string().trim().max(2000).optional(),
    })
    .refine(
      (body) => body.status !== undefined || body.adminNote !== undefined,
      "Nothing to update",
    ),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const feedbackIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>["body"];
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>["body"];
