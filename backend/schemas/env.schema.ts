import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  /** Mongo connection string (Atlas or a local mongod). */
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required to connect to MongoDB"),

  /** Comma separated list of browser origins allowed to send cookies. */
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  /** Signs short lived access tokens. */
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),

  /**
   * Refresh tokens are random strings, not JWTs — the pepper is mixed in
   * before hashing so a leaked database alone cannot be replayed.
   */
  REFRESH_TOKEN_PEPPER: z
    .string()
    .min(32, "REFRESH_TOKEN_PEPPER must be at least 32 characters"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  /** Public origin of the frontend, used to build shareable form links. */
  APP_ORIGIN: z.string().default("http://localhost:5173"),

  /**
   * SameSite policy for the auth cookies.
   *
   * "lax" is right when the API and the frontend share a domain. When they
   * are deployed separately (say a Vercel frontend calling a Render API) the
   * browser treats every request as cross-site and drops a lax cookie — that
   * setup needs "none", which browsers only honour over HTTPS.
   */
  COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),
});

export type Env = z.infer<typeof envSchema>;
