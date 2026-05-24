import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Get all notifications for current user
router.get("/", requireAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ notifications });
  } catch (e) {
    console.error("[GET /api/notifications] Error:", e.message);
    res.status(503).json({ error: "Could not load notifications. Please try again." });
  }
});

// Mark a specific notification as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    if (notif.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ notification: updated });
  } catch (e) {
    console.error("[PATCH /api/notifications/:id/read] Error:", e.message);
    res.status(503).json({ error: "Could not update notification." });
  }
});

// Mark all notifications as read
router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: "All notifications marked as read." });
  } catch (e) {
    console.error("[PATCH /api/notifications/read-all] Error:", e.message);
    res.status(503).json({ error: "Could not update notifications." });
  }
});

export default router;
