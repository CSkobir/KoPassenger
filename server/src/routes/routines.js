import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { ROUTES } from "./routes.js";

const router = Router();
const routeIdEnum = z.enum(ROUTES.map((r) => r.id));

const createRoutineSchema = z.object({
  routeId: routeIdEnum,
  departureTime: z.string().min(4), // "08:30"
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  fareTotal: z.number().int().min(0).max(1_000_000),
  seatsTotal: z.number().int().min(1).max(20),
});

// Create a new Routine (Organizer)
router.post("/", requireAuth, async (req, res) => {
  const parsed = createRoutineSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  try {
    const routine = await prisma.rideSchedule.create({
      data: {
        ownerId: req.userId,
        routeId: parsed.data.routeId,
        departureTime: parsed.data.departureTime,
        daysOfWeek: parsed.data.daysOfWeek,
        fareTotal: parsed.data.fareTotal,
        seatsTotal: parsed.data.seatsTotal,
        isActive: true,
      },
    });

    return res.status(201).json({ routine });
  } catch (e) {
    console.error("[POST /api/routines] Error:", e);
    return res.status(500).json({ error: "Failed to create fixed ride", detail: e.message });
  }
});

// Get all active routines for a route
router.get("/", requireAuth, async (req, res) => {
  const routeId = req.query.routeId;
  const parsedRoute = routeIdEnum.safeParse(routeId);
  
  if (!parsedRoute.success) {
    return res.status(400).json({ error: "routeId is required and must be a valid route" });
  }

  try {
    const routines = await prisma.rideSchedule.findMany({
      where: {
        routeId: parsedRoute.data,
        isActive: true,
        ownerId: { not: req.userId }
      },
      include: {
        owner: { select: { id: true, fullName: true, avatarUrl: true, rating: true, reviewsCount: true } },
        subscribers: {
          where: { status: 'ACCEPTED' },
          select: { id: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const routinesWithSeats = routines.map(r => ({
      ...r,
      seatsAvailable: Math.max(0, r.seatsTotal - r.subscribers.length)
    }));

    return res.json({ routines: routinesWithSeats });
  } catch (e) {
    console.error("[GET /api/routines] Error:", e.message);
    return res.status(503).json({ error: "Could not load fixed rides. Please try again." });
  }
});

// Get my routines (As organizer and as subscriber)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const asOrganizer = await prisma.rideSchedule.findMany({
      where: { ownerId: req.userId },
      include: {
        subscribers: {
          include: {
            passenger: { select: { id: true, fullName: true, avatarUrl: true, rating: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const asSubscriber = await prisma.scheduleSubscriber.findMany({
      where: { passengerId: req.userId },
      include: {
        schedule: {
          include: {
            owner: { select: { id: true, fullName: true, avatarUrl: true, rating: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ asOrganizer, asSubscriber });
  } catch (e) {
    console.error("[GET /api/routines/me] Error:", e.message);
    return res.status(503).json({ error: "Could not load your fixed rides. Please try again." });
  }
});

// Subscribe to a routine (Co-passenger)
router.post("/:id/subscribe", requireAuth, async (req, res) => {
  const routine = await prisma.rideSchedule.findUnique({
    where: { id: req.params.id },
    include: { subscribers: { where: { status: 'ACCEPTED' } } }
  });

  if (!routine) return res.status(404).json({ error: "Fixed ride not found" });
  if (routine.ownerId === req.userId) return res.status(400).json({ error: "Cannot subscribe to your own fixed ride" });
  if (!routine.isActive) return res.status(400).json({ error: "Fixed ride is no longer active" });
  if (routine.subscribers.length >= routine.seatsTotal) return res.status(400).json({ error: "Fixed ride is full" });

  try {
    const subscription = await prisma.scheduleSubscriber.create({
      data: {
        scheduleId: routine.id,
        passengerId: req.userId,
        status: "PENDING"
      }
    });

    await prisma.notification.create({
      data: {
        userId: routine.ownerId,
        type: "ROUTINE_SUBSCRIPTION",
        title: "New Fixed Co-passenger Request",
        message: "Someone wants to join your fixed ride.",
        link: "/my-fixed-rides",
      },
    });

    return res.status(201).json({ subscription });
  } catch (e) {
    // Unique constraint = duplicate subscription
    if (e.code === "P2002") {
      return res.status(409).json({ error: "You have already requested to join this fixed ride" });
    }
    console.error("[POST /api/routines/:id/subscribe] Error:", e);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

// Accept a subscriber (Organizer)
router.post("/subscriptions/:subId/accept", requireAuth, async (req, res) => {
  try {
    const subscription = await prisma.scheduleSubscriber.findUnique({
      where: { id: req.params.subId },
      include: { schedule: true }
    });

    if (!subscription) return res.status(404).json({ error: "Subscription not found" });
    if (subscription.schedule.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });
    if (subscription.status !== "PENDING") return res.status(400).json({ error: "Only PENDING requests can be accepted" });

    const updated = await prisma.scheduleSubscriber.update({
      where: { id: subscription.id },
      data: { status: "ACCEPTED" }
    });

    try {
      await prisma.notification.create({
        data: {
          userId: subscription.passengerId,
          type: "ROUTINE_ACCEPTED",
          title: "Fixed Ride Request Accepted",
          message: "The organizer has accepted you as a fixed co-passenger!",
          link: "/my-fixed-rides",
        },
      });
    } catch (_) { /* non-critical, ignore */ }

    res.json({ subscription: updated });
  } catch (e) {
    console.error("[POST /api/routines/subscriptions/:id/accept] Error:", e.message);
    res.status(503).json({ error: "Could not accept subscription. Please try again." });
  }
});

// Reject/Cancel a subscriber
router.post("/subscriptions/:subId/cancel", requireAuth, async (req, res) => {
  try {
    const subscription = await prisma.scheduleSubscriber.findUnique({
      where: { id: req.params.subId },
      include: { schedule: true }
    });

    if (!subscription) return res.status(404).json({ error: "Subscription not found" });
    
    const isOrganizer = subscription.schedule.ownerId === req.userId;
    const isPassenger = subscription.passengerId === req.userId;
    if (!isOrganizer && !isPassenger) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.scheduleSubscriber.update({
      where: { id: subscription.id },
      data: { status: isOrganizer ? "REJECTED" : "CANCELLED" }
    });

    res.json({ subscription: updated });
  } catch (e) {
    console.error("[POST /api/routines/subscriptions/:id/cancel] Error:", e.message);
    res.status(503).json({ error: "Could not cancel subscription. Please try again." });
  }
});

// Toggle routine active status
router.patch("/:id/toggle", requireAuth, async (req, res) => {
  try {
    const routine = await prisma.rideSchedule.findUnique({ where: { id: req.params.id } });
    if (!routine) return res.status(404).json({ error: "Fixed ride not found" });
    if (routine.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.rideSchedule.update({
      where: { id: routine.id },
      data: { isActive: !routine.isActive }
    });

    res.json({ routine: updated });
  } catch (e) {
    console.error("[PATCH /api/routines/:id/toggle] Error:", e.message);
    res.status(503).json({ error: "Could not update fixed ride status. Please try again." });
  }
});

export default router;
