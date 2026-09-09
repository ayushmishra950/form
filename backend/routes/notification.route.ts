import { Router } from "express";
import {
  clearAll,
  listNotifications,
  markAllRead,
  markRead,
} from "../controllers/notification.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validate } from "../middleware/validate.ts";
import { notificationIdSchema } from "../schemas/notification.schema.ts";

const router = Router();

// Everyone reads only their own notifications.
router.use(authenticate);

router.get("/", listNotifications);
router.patch("/:id/read", validate(notificationIdSchema), markRead);
router.post("/read-all", markAllRead);
router.delete("/", clearAll);

export default router;
