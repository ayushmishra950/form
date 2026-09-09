import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import User, { accountBlockReason } from "../models/User.ts";
import { ApiError } from "../utils/ApiError.ts";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  issueRefreshToken,
  revokeAllUserTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  setAuthCookies,
  signAccessToken,
} from "../utils/tokens.ts";
import type { LoginInput, RegisterInput } from "../schemas/user.schema.ts";
import { notifyAdmins } from "../services/notify.ts";

/** Shape returned to the client — never includes the password hash. */
const publicUser = (user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
}) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
});

const requestContext = (req: Request) => ({
  userAgent: req.get("user-agent") ?? undefined,
  ip: req.ip,
});

/** POST /api/auth/register — creates the account and signs the user straight in. */
export const register = async (
  req: Request<Record<string, string>, unknown, RegisterInput>,
  res: Response,
) => {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });

  const accessToken = signAccessToken({
    sub: String(user._id),
    email: user.email,
    role: user.role,
  });
  const { rawToken } = await issueRefreshToken({
    userId: user._id as Types.ObjectId,
    ...requestContext(req),
  });

  setAuthCookies(res, { accessToken, refreshToken: rawToken });

  // Every admin learns about the signup in real time.
  await notifyAdmins(
    {
      type: "user_registered",
      title: "New user registered",
      body: `${user.name} (${user.email}) just created an account.`,
      link: "/admin/users",
      actorId: user._id as Types.ObjectId,
      actorName: user.name,
    },
    user._id as Types.ObjectId, // in case an admin ever self-registers
  );

  res.status(201).json({
    success: true,
    message: "Account created",
    data: { user: publicUser(user) },
  });
};

/** POST /api/auth/login */
export const login = async (
  req: Request<Record<string, string>, unknown, LoginInput>,
  res: Response,
) => {
  const { email, password } = req.body;

  // passwordHash is `select: false`, so ask for it explicitly.
  const user = await User.findOne({ email }).select("+passwordHash");

  // Compare even when the user is missing, so response time does not leak
  // whether the email is registered.
  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv",
  );

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized("Email or password is incorrect");
  }

  // Only told *after* the password checks out, so the endpoint cannot be used
  // to discover which emails are registered.
  const blocked = accountBlockReason(user);
  if (blocked) {
    throw ApiError.forbidden(blocked);
  }

  const accessToken = signAccessToken({
    sub: String(user._id),
    email: user.email,
    role: user.role,
  });
  const { rawToken } = await issueRefreshToken({
    userId: user._id as Types.ObjectId,
    ...requestContext(req),
  });

  setAuthCookies(res, { accessToken, refreshToken: rawToken });

  res.status(200).json({
    success: true,
    message: "Signed in",
    data: { user: publicUser(user) },
  });
};

/**
 * POST /api/auth/refresh
 *
 * Rotates the refresh token and mints a new access token. Both arrive as
 * httpOnly cookies; nothing is returned in the body.
 */
export const refresh = async (req: Request, res: Response) => {
  const presented = req.cookies?.[REFRESH_COOKIE];

  if (!presented) {
    throw ApiError.unauthorized("No refresh token present");
  }

  let rotated;
  try {
    rotated = await rotateRefreshToken(presented, requestContext(req));
  } catch (error) {
    // A bad or replayed token should not leave a stale cookie behind.
    clearAuthCookies(res);
    throw error;
  }

  const user = await User.findById(rotated.userId);
  if (!user) {
    clearAuthCookies(res);
    throw ApiError.unauthorized("Account no longer exists");
  }

  const blocked = accountBlockReason(user);
  if (blocked) {
    await revokeAllUserTokens(user._id as Types.ObjectId);
    clearAuthCookies(res);
    throw ApiError.forbidden(blocked);
  }

  const accessToken = signAccessToken({
    sub: String(user._id),
    email: user.email,
    role: user.role,
  });

  setAuthCookies(res, { accessToken, refreshToken: rotated.rawToken });

  res.status(200).json({
    success: true,
    message: "Session refreshed",
    data: { user: publicUser(user) },
  });
};

/** POST /api/auth/logout — revokes this session only. */
export const logout = async (req: Request, res: Response) => {
  const presented = req.cookies?.[REFRESH_COOKIE];
  if (presented) await revokeRefreshToken(presented);

  clearAuthCookies(res);
  res.status(200).json({ success: true, message: "Signed out" });
};

/** POST /api/auth/logout-all — revokes every session for the current user. */
export const logoutAll = async (req: Request, res: Response) => {
  if (req.user) {
    await revokeAllUserTokens(new Types.ObjectId(req.user.id));
  }
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: "Signed out everywhere" });
};

/** GET /api/auth/me — used by the frontend to restore a session on reload. */
export const me = async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.id);
  if (!user) throw ApiError.unauthorized("Account no longer exists");

  res.status(200).json({ success: true, data: { user: publicUser(user) } });
};
