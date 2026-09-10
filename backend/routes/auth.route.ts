import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
  resetPassword,
} from "../controllers/auth.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validate } from "../middleware/validate.ts";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../schemas/user.schema.ts";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh); // reads the rotating cookie, no body
router.post("/logout", logout);

/* Forgot-password flow — both steps are public by design. */
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.post("/logout-all", authenticate, logoutAll);
router.get("/me", authenticate, me);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePassword,
);

export default router;
