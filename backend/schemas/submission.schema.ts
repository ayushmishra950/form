import { z } from "zod";

const responseValue = z.union([z.string(), z.array(z.string())]);

export const createSubmissionSchema = z.object({
  body: z.object({
    responses: z.record(z.string(), responseValue),
  }),
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Not a valid id") }),
  query: z.object({}).optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>["body"];
