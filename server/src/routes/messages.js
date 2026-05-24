import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Helper: verify the current user is the driver or the passenger of this request
async function assertParticipant(rideRequestId, userId) {
  const rr = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    select: {
      status: true,
      passengerId: true,
      ridePost: { select: { ownerId: true } },
    },
  });
  if (!rr) return null;
  const isParticipant =
    rr.passengerId === userId || rr.ridePost.ownerId === userId;
  return isParticipant ? rr : null;
}

// GET /api/messages/conversations
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const asPassenger = await prisma.rideRequest.findMany({
      where: { passengerId: req.userId },
      select: {
        id: true,
        status: true,
        passengerId: true,
        ridePost: {
          select: {
            id: true,
            routeId: true,
            departureTime: true,
            ownerId: true,
            owner: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, content: true, createdAt: true, senderId: true, isRead: true },
        },
      },
    });

    const asDriver = await prisma.rideRequest.findMany({
      where: { ridePost: { ownerId: req.userId } },
      select: {
        id: true,
        status: true,
        passengerId: true,
        passenger: { select: { id: true, fullName: true, avatarUrl: true } },
        ridePost: {
          select: {
            id: true,
            routeId: true,
            departureTime: true,
            ownerId: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, content: true, createdAt: true, senderId: true, isRead: true },
        },
      },
    });

    const allRequests = [
      ...asPassenger.map((r) => ({
        rideRequestId: r.id,
        status: r.status,
        otherUser: r.ridePost.owner,
        ridePost: r.ridePost,
        lastMessage: r.messages[0] ?? null,
        role: "passenger",
      })),
      ...asDriver.map((r) => ({
        rideRequestId: r.id,
        status: r.status,
        otherUser: r.passenger,
        ridePost: r.ridePost,
        lastMessage: r.messages[0] ?? null,
        role: "driver",
      })),
    ];

    const withMessages = allRequests.filter(
      (c) => c.lastMessage !== null || ["ACCEPTED", "PENDING"].includes(c.status)
    );

    const unreadCounts = await Promise.all(
      withMessages.map((c) =>
        prisma.message.count({
          where: {
            rideRequestId: c.rideRequestId,
            senderId: { not: req.userId },
            isRead: false,
          },
        })
      )
    );

    const conversations = withMessages.map((c, i) => ({
      ...c,
      unreadCount: unreadCounts[i],
    }));

    conversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    res.json({ conversations });
  } catch (e) {
    console.error("[GET /api/messages/conversations] Error:", e.message);
    res.status(503).json({ error: "Could not load conversations. Please try again." });
  }
});

// GET /api/messages/:rideRequestId — fetch chat history
router.get("/:rideRequestId", requireAuth, async (req, res) => {
  try {
    const rr = await assertParticipant(req.params.rideRequestId, req.userId);
    if (!rr) return res.status(403).json({ error: "Forbidden or not found" });

    const messages = await prisma.message.findMany({
      where: { rideRequestId: req.params.rideRequestId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        isRead: true,
        createdAt: true,
        senderId: true,
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    await prisma.message.updateMany({
      where: {
        rideRequestId: req.params.rideRequestId,
        senderId: { not: req.userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ messages });
  } catch (e) {
    console.error("[GET /api/messages/:id] Error:", e.message);
    res.status(503).json({ error: "Could not load messages. Please try again." });
  }
});

// POST /api/messages/:rideRequestId — send a message
const sendSchema = z.object({ content: z.string().min(1).max(1000) });

router.post("/:rideRequestId", requireAuth, async (req, res) => {
  try {
    const rr = await assertParticipant(req.params.rideRequestId, req.userId);
    if (!rr) return res.status(403).json({ error: "Forbidden or not found" });

    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

    if (rr.status === "REJECTED" || rr.status === "CANCELLED") {
      return res.status(403).json({ error: "Chat is closed for this request." });
    }

    const message = await prisma.message.create({
      data: {
        rideRequestId: req.params.rideRequestId,
        senderId: req.userId,
        content: parsed.data.content,
      },
      select: {
        id: true,
        content: true,
        isRead: true,
        createdAt: true,
        senderId: true,
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ message });
  } catch (e) {
    console.error("[POST /api/messages/:id] Error:", e.message);
    res.status(503).json({ error: "Could not send message. Please try again." });
  }
});

// PATCH /api/messages/:rideRequestId/read
router.patch("/:rideRequestId/read", requireAuth, async (req, res) => {
  try {
    const rr = await assertParticipant(req.params.rideRequestId, req.userId);
    if (!rr) return res.status(403).json({ error: "Forbidden or not found" });

    await prisma.message.updateMany({
      where: {
        rideRequestId: req.params.rideRequestId,
        senderId: { not: req.userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/messages/:id/read] Error:", e.message);
    res.status(503).json({ error: "Could not mark messages as read." });
  }
});

export default router;
