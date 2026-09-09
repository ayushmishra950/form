import { Router } from "express";
import {
  deleteAnyForm,
  getStats,
  getUser,
  listAllForms,
  listUsers,
  purgeUser,
  restoreUser,
  softDeleteUser,
  updateFormStatus,
  updateUserRole,
  updateUserStatus,
} from "../controllers/admin.controller.ts";
import {
  deleteFeedback,
  listAllFeedback,
  updateFeedback,
} from "../controllers/feedback.controller.ts";
import { authenticate, requireRole } from "../middleware/authenticate.ts";
import { validate } from "../middleware/validate.ts";
import {
  feedbackIdSchema,
  listFeedbackSchema,
  updateFeedbackSchema,
} from "../schemas/feedback.schema.ts";
import {
  idParamSchema,
  listQuerySchema,
  updateFormStatusSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "../schemas/admin.schema.ts";

const router = Router();

// Everything below is admin-only.
router.use(authenticate, requireRole("admin"));

router.get("/stats", getStats);

router.get("/users", validate(listQuerySchema), listUsers);
router.get("/users/:id", validate(idParamSchema), getUser);
router.patch("/users/:id/status", validate(updateUserStatusSchema), updateUserStatus);
router.patch("/users/:id/role", validate(updateUserRoleSchema), updateUserRole);
router.delete("/users/:id", validate(idParamSchema), softDeleteUser);
router.post("/users/:id/restore", validate(idParamSchema), restoreUser);
router.delete("/users/:id/purge", validate(idParamSchema), purgeUser);

router.get("/feedback", validate(listFeedbackSchema), listAllFeedback);
router.patch("/feedback/:id", validate(updateFeedbackSchema), updateFeedback);
router.delete("/feedback/:id", validate(feedbackIdSchema), deleteFeedback);

router.get("/forms", validate(listQuerySchema), listAllForms);
router.patch("/forms/:id/status", validate(updateFormStatusSchema), updateFormStatus);
router.delete("/forms/:id", validate(idParamSchema), deleteAnyForm);

export default router;
