import { Router } from "express";
import {
  createForm,
  deleteForm,
  getForm,
  getPublicForm,
  listForms,
  updateForm,
} from "../controllers/form.controller.ts";
import {
  createSubmission,
  listSubmissions,
} from "../controllers/submission.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validate } from "../middleware/validate.ts";
import {
  createFormSchema,
  formIdSchema,
  updateFormSchema,
} from "../schemas/form.schema.ts";
import { createSubmissionSchema } from "../schemas/submission.schema.ts";

const router = Router();

/* ---------- Public: the shareable link and its responses ---------- */
router.get("/:id/public", validate(formIdSchema), getPublicForm);
router.post("/:id/submissions", validate(createSubmissionSchema), createSubmission);

/* ---------- Owner only ---------- */
router.use(authenticate);

router.get("/", listForms);
router.post("/", validate(createFormSchema), createForm);
router.get("/:id", validate(formIdSchema), getForm);
router.put("/:id", validate(updateFormSchema), updateForm);
router.delete("/:id", validate(formIdSchema), deleteForm);
router.get("/:id/submissions", validate(formIdSchema), listSubmissions);

export default router;
