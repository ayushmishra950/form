import type { NextFunction, Request, Response } from "express";
import User, { accountBlockReason } from "../models/User.ts";
import { ACCESS_COOKIE, verifyAccessToken } from "../utils/tokens.ts";
import { ApiError } from "../utils/ApiError.ts";

/**
 * Reads the access token from its httpOnly cookie and attaches the caller to
 * `req.user`. The token is never taken from a header or the request body, so
 * client-side JavaScript can neither read nor forge it.
 *
 * The account is re-read on every request rather than trusted from the token.
 * That costs one indexed lookup, and in exchange a deactivated, deleted or
 * demoted user loses access immediately instead of when their 15-minute
 * access token happens to expire.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[ACCESS_COOKIE];

  if (!token) {
    next(ApiError.unauthorized("Sign in to continue"));
    return;
  }

  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub).select("email role isActive deletedAt");

  if (!user) {
    next(ApiError.unauthorized("Account no longer exists"));
    return;
  }

  const blocked = accountBlockReason(user);
  if (blocked) {
    next(ApiError.forbidden(blocked));
    return;
  }

  req.user = { id: String(user._id), email: user.email, role: user.role };
  next();
}

/** Route guard for admin-only endpoints. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(ApiError.forbidden("Admin access is required for this action"));
      return;
    }
    next();
  };
}
