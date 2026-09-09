import { z } from "zod";

export const notificationIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Not a valid id"),
  }),
  query: z.object({}).optional(),
});
