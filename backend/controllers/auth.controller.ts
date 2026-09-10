import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import User, { accountBlockReason } from "../models/User.ts";
import PasswordReset from "../models/PasswordReset.ts";
import { ApiError } from "../utils/ApiError.ts";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  createOpaqueToken,
  hashResetToken,
  issueRefreshToken,
  revokeAllUserTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  setAuthCookies,
  signAccessToken,
} from "../utils/tokens.ts";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../schemas/user.schema.ts";
import { notifyAdmins, notifyUser } from "../services/notify.ts";

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

/* ------------------------------------------------------------------ *
 * Password management
 * ------------------------------------------------------------------ */

/** Reset tokens are deliberately short-lived. */
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

/** Every password change ends the same way: new hash, all sessions dropped. */
async function applyNewPassword(
  user: { _id: unknown; passwordHash: string; save: () => Promise<unknown> },
  newPassword: string,
): Promise<void> {
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  // Anyone holding an old refresh token — including an attacker — is logged
  // out by the change.
  await revokeAllUserTokens(user._id as Types.ObjectId);
}

/**
 * POST /api/auth/forgot-password
 *
 * Confirms the account exists and hands back a single-use token for step two.
 *
 * NOTE: with no mail provider wired up the token is returned in the response,
 * so knowing a registered email is enough to reset that password. To make
 * this safe, email the token instead of returning it — the only change needed
 * is to drop `resetToken` from the payload below and send it as a link.
 */
export const forgotPassword = async (
  req: Request<Record<string, string>, unknown, ForgotPasswordInput>,
  res: Response,
) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    throw ApiError.notFound("No account is registered with that email");
  }

  const blocked = accountBlockReason(user);
  if (blocked) throw ApiError.forbidden(blocked);

  // Any earlier request for this account is void once a new one is made.
  await PasswordReset.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: new Date() } },
  );

  const rawToken = createOpaqueToken();
  await PasswordReset.create({
    userId: user._id,
    tokenHash: hashResetToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    requestedIp: req.ip ?? null,
  });

  res.status(200).json({
    success: true,
    message: "Email verified — choose a new password",
    data: {
      email: user.email,
      name: user.name,
      resetToken: rawToken,
      expiresInMinutes: RESET_TOKEN_TTL_MS / 60000,
    },
  });
};

/** POST /api/auth/reset-password — step two of the forgot-password flow. */
export const resetPassword = async (
  req: Request<Record<string, string>, unknown, ResetPasswordInput>,
  res: Response,
) => {
  const record = await PasswordReset.findOne({
    tokenHash: hashResetToken(req.body.token),
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest(
      "This reset link is no longer valid — start again from the sign-in page",
    );
  }

  const user = await User.findById(record.userId).select("+passwordHash");
  if (!user) throw ApiError.notFound("Account no longer exists");

  const blocked = accountBlockReason(user);
  if (blocked) throw ApiError.forbidden(blocked);

  await applyNewPassword(user, req.body.password);

  record.usedAt = new Date();
  await record.save();

  // The reset already invalidated every session; make sure this browser is
  // not left holding stale cookies either.
  clearAuthCookies(res);

  await notifyUser(user._id as Types.ObjectId, {
    type: "password_changed",
    title: "Your password was reset",
    body: "If this was not you, contact the admin team straight away.",
    link: "/dashboard",
  });

  res.status(200).json({
    success: true,
    message: "Password updated — sign in with your new password",
  });
};

/**
 * POST /api/auth/change-password — for a user who is already signed in.
 *
 * Every other session is dropped, and this browser is handed a fresh pair of
 * cookies so the person stays where they are.
 */
export const changePassword = async (
  req: Request<Record<string, string>, unknown, ChangePasswordInput>,
  res: Response,
) => {
  const user = await User.findById(req.user!.id).select("+passwordHash");
  if (!user) throw ApiError.unauthorized("Account no longer exists");

  const matches = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
  if (!matches) {
    throw ApiError.badRequest("Your current password is not correct", [
      { field: "currentPassword", message: "That is not your current password" },
    ]);
  }

  await applyNewPassword(user, req.body.newPassword);

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

  await notifyUser(user._id as Types.ObjectId, {
    type: "password_changed",
    title: "Your password was changed",
    body: "Every other device has been signed out.",
    link: "/dashboard",
  });

  res.status(200).json({
    success: true,
    message: "Password changed — other devices have been signed out",
  });
};
