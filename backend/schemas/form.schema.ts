import { z } from "zod";
import { FIELD_TYPES } from "../models/Form.ts";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Not a valid id");

const formFieldSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    label: z.string().trim().min(1, "Every field needs a label"),
    placeholder: z.string().trim().optional(),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1)).optional(),
  })
  .superRefine((field, ctx) => {
    const needsOptions =
      field.type === "select" || field.type === "radio" || field.type === "checkbox";

    if (needsOptions && (!field.options || field.options.length === 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: `A "${field.type}" field needs at least one option`,
      });
    }
  });

const formBody = z.object({
  title: z.string().trim().min(1, "Form title is required"),
  description: z.string().trim().optional(),
  fields: z.array(formFieldSchema).min(1, "Add at least one field"),
  isActive: z.boolean().optional(),
});

export const createFormSchema = z.object({
  body: formBody,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateFormSchema = z.object({
  body: formBody.partial(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const formIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export type CreateFormInput = z.infer<typeof createFormSchema>["body"];
export type UpdateFormInput = z.infer<typeof updateFormSchema>["body"];
