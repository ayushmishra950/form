import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { isProduction } from "../config/env.ts";
import { ApiError } from "../utils/ApiError.ts";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

/** Single place where every thrown error becomes a JSON response. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  let statusCode = 500;
  let message = "Something went wrong";
  let details: unknown;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(error.errors).map((issue) => ({
      field: issue.path,
      message: issue.message,
    }));
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for ${error.path}`;
  } else if (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  ) {
    statusCode = 409;
    message = "That value is already in use";
  } else if (error instanceof Error) {
    message = isProduction ? "Something went wrong" : error.message;
  }

  if (statusCode >= 500) {
    console.error("💥 Unhandled error:", error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details !== undefined ? { errors: details } : {}),
  });
}
