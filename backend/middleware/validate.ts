import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../utils/ApiError.ts";

/**
 * Runs a Zod schema shaped as `{ body, params, query }` against the request.
 *
 * Only `body` is written back — in Express 5 `req.query` is a getter and
 * cannot be reassigned.
 */
export const validate =
  (schema: ZodType<{ body?: unknown; params?: unknown; query?: unknown }>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.slice(1).join(".") || issue.path.join("."),
        message: issue.message,
      }));
      next(ApiError.badRequest("Validation failed", details));
      return;
    }

    if (result.data.body !== undefined) {
      req.body = result.data.body;
    }
    next();
  };
