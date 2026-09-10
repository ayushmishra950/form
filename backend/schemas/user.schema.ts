import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address");

/**
 * Rules for any password the user chooses.
 *
 * Each rule is its own check so the client can show exactly what is missing
 * instead of one vague "password is too weak".
 */
export const strongPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Keep it under 128 characters")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email,
    password: strongPassword,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email,
    // Deliberately loose: an existing password only has to match, not pass
    // today's rules.
    password: z.string().min(1, "Password is required"),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

/** Step 1 of the reset flow — look the account up by email. */
export const forgotPasswordSchema = z.object({
  body: z.object({ email }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

/** Step 2 — set the new password using the token from step 1. */
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(16, "Reset link is invalid"),
    password: strongPassword,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

/** Signed-in password change. */
export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, "Enter your current password"),
      newPassword: strongPassword,
    })
    .refine((body) => body.currentPassword !== body.newPassword, {
      path: ["newPassword"],
      message: "Choose a password you have not used here before",
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];
