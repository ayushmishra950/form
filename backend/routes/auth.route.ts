import { Router } from "express";
import {
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
} from "../controllers/auth.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validate } from "../middleware/validate.ts";
import { loginSchema, registerSchema } from "../schemas/user.schema.ts";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh); // reads the rotating cookie, no body
router.post("/logout", logout);

router.post("/logout-all", authenticate, logoutAll);
router.get("/me", authenticate, me);

export default router;
