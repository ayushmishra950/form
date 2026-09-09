import { Router } from "express";
import {
  createFeedback,
  deleteMyFeedback,
  listMyFeedback,
} from "../controllers/feedback.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validate } from "../middleware/validate.ts";
import {
  createFeedbackSchema,
  feedbackIdSchema,
} from "../schemas/feedback.schema.ts";

const router = Router();

// Signing in is enough — this is the user-facing side of the feature.
router.use(authenticate);

router.post("/", validate(createFeedbackSchema), createFeedback);
router.get("/mine", listMyFeedback);
router.delete("/:id", validate(feedbackIdSchema), deleteMyFeedback);

export default router;
