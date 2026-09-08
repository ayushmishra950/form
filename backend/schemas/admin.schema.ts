import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Not a valid id");

export const listQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(["all", "active", "inactive", "deleted"]).default("all"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const idParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const updateUserStatusSchema = z.object({
  body: z.object({ isActive: z.boolean() }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const updateUserRoleSchema = z.object({
  body: z.object({ role: z.enum(["admin", "user"]) }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export const updateFormStatusSchema = z.object({
  body: z.object({ isActive: z.boolean() }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>["query"];
