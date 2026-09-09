import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Response } from "express";
import type { Types } from "mongoose";
import env, { isProduction } from "../config/env.ts";
import RefreshToken from "../models/RefreshToken.ts";
import { ApiError } from "./ApiError.ts";

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";

/**
 * The refresh cookie is scoped to the auth routes, so it is not attached to
 * every ordinary API call — only to the endpoints that can actually rotate it.
 */
const REFRESH_COOKIE_PATH = "/api/auth";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

const refreshTtlMs = () => env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Cookie flags shared by both tokens.
 *
 * `SameSite=None` is only honoured on a secure connection, so it implies
 * `secure` regardless of NODE_ENV — otherwise the browser silently discards
 * the cookie and sign-in appears to do nothing.
 */
const baseCookieOptions = () => {
  const sameSite = env.COOKIE_SAMESITE;
  return {
    httpOnly: true, // never readable from JavaScript
    secure: isProduction || sameSite === "none",
    sameSite,
  } as const;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as NonNullable<jwt.SignOptions["expiresIn"]>,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
  } catch {
    throw ApiError.unauthorized("Access token is invalid or has expired");
  }
}

/** Hashes a raw refresh token so the database never stores the real value. */
function hashRefreshToken(rawToken: string): string {
  return crypto
    .createHmac("sha256", env.REFRESH_TOKEN_PEPPER)
    .update(rawToken)
    .digest("hex");
}

interface IssueOptions {
  userId: Types.ObjectId;
  family?: string;
  userAgent?: string | undefined;
  ip?: string | undefined;
}

/** Creates and persists a new refresh token, returning the raw value once. */
export async function issueRefreshToken({
  userId,
  family,
  userAgent,
  ip,
}: IssueOptions): Promise<{ rawToken: string; tokenHash: string; family: string }> {
  const rawToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashRefreshToken(rawToken);
  const tokenFamily = family ?? crypto.randomUUID();

  await RefreshToken.create({
    userId,
    tokenHash,
    family: tokenFamily,
    expiresAt: new Date(Date.now() + refreshTtlMs()),
    userAgent: userAgent ?? null,
    ip: ip ?? null,
  });

  return { rawToken, tokenHash, family: tokenFamily };
}

/**
 * Exchanges a refresh token for a fresh one.
 *
 * Throws (and burns the whole family) if the presented token was already
 * used, which is the signature of a stolen-token replay.
 */
export async function rotateRefreshToken(
  rawToken: string,
  context: { userAgent?: string | undefined; ip?: string | undefined },
): Promise<{ userId: Types.ObjectId; rawToken: string }> {
  const tokenHash = hashRefreshToken(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored) {
    throw ApiError.unauthorized("Refresh token is not recognised");
  }

  if (stored.revokedAt) {
    // Reuse detected: every descendant of this login is now suspect.
    await RefreshToken.updateMany(
      { family: stored.family, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    throw ApiError.unauthorized("Refresh token was already used — session revoked");
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw ApiError.unauthorized("Refresh token has expired");
  }

  const next = await issueRefreshToken({
    userId: stored.userId,
    family: stored.family,
    userAgent: context.userAgent,
    ip: context.ip,
  });

  stored.revokedAt = new Date();
  stored.replacedByHash = next.tokenHash;
  await stored.save();

  return { userId: stored.userId, rawToken: next.rawToken };
}

/** Revokes a single token; used on logout. */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await RefreshToken.updateOne(
    { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

/** Revokes every outstanding session for a user. */
export async function revokeAllUserTokens(userId: Types.ObjectId): Promise<void> {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    path: "/",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: refreshTtlMs(),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
  });
}
