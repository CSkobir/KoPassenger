import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { ROUTES } from "./routes.js";

const router = Router();

const routeIdEnum = z.enum(ROUTES.map((r) => r.id));

function parseIntSafe(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
}

function toIsoOrNull(v) {
  const d = new Date(v);
  // eslint-disable-next-line no-restricted-globals
  return isNaN(d.getTime()) ? null : d;
}

const createRideSchema = z.object({
  routeId: routeIdEnum,
  departureTime: z.string().min(1),
  fareTotal: z.number().int().min(0).max(1_000_000),
  seatsTotal: z.number().int().min(1).max(20),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createRideSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const departure = toIsoOrNull(parsed.data.departureTime);
  if (!departure) return res.status(400).json({ error: "Invalid departureTime" });
  if (departure.getTime() < Date.now() - 60_000) {
    return res.status(400).json({ error: "Departure time must be in the future" });
  }

  const ride = await prisma.ridePost.create({
    data: {
      ownerId: req.userId,
      routeId: parsed.data.routeId,
      departureTime: departure,
      fareTotal: parsed.data.fareTotal,
      seatsTotal: parsed.data.seatsTotal,
      seatsAvailable: parsed.data.seatsTotal,
      status: "OPEN",
    },
    select: {
      id: true,
      ownerId: true,
      routeId: true,
      departureTime: true,
      fareTotal: true,
      seatsTotal: true,
      seatsAvailable: true,
      status: true,
      createdAt: true,
    },
  });

  return res.status(201).json({ ride });
});

router.get("/", requireAuth, async (req, res) => {
  const routeId = req.query.routeId;
  const fromTime = req.query.fromTime;
  const toTime = req.query.toTime;

  const parsedRoute = routeIdEnum.safeParse(routeId);
  if (!parsedRoute.success) {
    return res.status(400).json({ error: "routeId is required and must be a valid route" });
  }

  const from = fromTime ? toIsoOrNull(fromTime) : new Date(Date.now() - 60_000);
  const to = toTime ? toIsoOrNull(toTime) : new Date(Date.now() + 2 * 60 * 60 * 1000);
  if (!from || !to) return res.status(400).json({ error: "Invalid fromTime/toTime" });
  if (from > to) return res.status(400).json({ error: "fromTime must be before toTime" });

  const rides = await prisma.ridePost.findMany({
    where: {
      routeId: parsedRoute.data,
      status: "OPEN",
      seatsAvailable: { gt: 0 },
      departureTime: { gte: from, lte: to },
      ownerId: { not: req.userId },
    },
    orderBy: [{ departureTime: "asc" }, { seatsAvailable: "desc" }],
    select: {
      id: true,
      ownerId: true,
      routeId: true,
      departureTime: true,
      fareTotal: true,
      seatsTotal: true,
      seatsAvailable: true,
      status: true,
      createdAt: true,
      owner: { select: { id: true, fullName: true, avatarUrl: true, rating: true, reviewsCount: true } },
    },
    take: 100,
  });

  return res.json({ rides });
});

router.get("/public", async (req, res) => {
  const rides = await prisma.ridePost.findMany({
    where: {
      status: "OPEN",
      seatsAvailable: { gt: 0 },
      departureTime: { gte: new Date() },
    },
    orderBy: { departureTime: "asc" },
    select: {
      id: true,
      routeId: true,
      departureTime: true,
      fareTotal: true,
      seatsTotal: true,
      seatsAvailable: true,
    },
    take: 6,
  });
  res.json({ rides });
});

router.get("/mine", requireAuth, async (req, res) => {
  const rides = await prisma.ridePost.findMany({
    where: { ownerId: req.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      routeId: true,
      departureTime: true,
      fareTotal: true,
      seatsTotal: true,
      seatsAvailable: true,
      status: true,
      createdAt: true,
      requests: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          passenger: { select: { id: true, fullName: true, email: true, avatarUrl: true, rating: true, reviewsCount: true } },
        },
      },
    },
  });
  res.json({ rides });
});

router.get("/:id", requireAuth, async (req, res) => {
  const ride = await prisma.ridePost.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      ownerId: true,
      routeId: true,
      departureTime: true,
      fareTotal: true,
      seatsTotal: true,
      seatsAvailable: true,
      status: true,
      createdAt: true,
      owner: { select: { id: true, fullName: true, avatarUrl: true, rating: true, reviewsCount: true } },
    },
  });
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  res.json({ ride });
});

const updateRideSchema = z.object({
  departureTime: z.string().min(1).optional(),
  fareTotal: z.number().int().min(0).max(1_000_000).optional(),
  seatsTotal: z.number().int().min(1).max(20).optional(),
});

router.patch("/:id", requireAuth, async (req, res) => {
  const parsed = updateRideSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const ride = await prisma.ridePost.findUnique({ where: { id: req.params.id } });
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  if (ride.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });
  if (ride.status !== "OPEN") return res.status(400).json({ error: "Only OPEN rides can be updated" });

  const data = {};
  if (parsed.data.departureTime !== undefined) {
    const departure = toIsoOrNull(parsed.data.departureTime);
    if (!departure) return res.status(400).json({ error: "Invalid departureTime" });
    if (departure.getTime() < Date.now() - 60_000) {
      return res.status(400).json({ error: "Departure time must be in the future" });
    }
    data.departureTime = departure;
  }
  if (parsed.data.fareTotal !== undefined) data.fareTotal = parsed.data.fareTotal;
  if (parsed.data.seatsTotal !== undefined) {
    const nextSeats = parsed.data.seatsTotal;
    const acceptedCount = await prisma.rideRequest.count({
      where: { ridePostId: ride.id, status: "ACCEPTED" },
    });
    if (nextSeats < acceptedCount) {
      return res
        .status(400)
        .json({ error: `seatsTotal cannot be less than accepted passengers (${acceptedCount})` });
    }
    data.seatsTotal = nextSeats;
    data.seatsAvailable = Math.max(0, nextSeats - acceptedCount);
  }

  if (Object.keys(data).length === 0) return res.status(400).json({ error: "No changes" });

  const updated = await prisma.ridePost.update({
    where: { id: ride.id },
    data,
    select: {
      id: true,
      ownerId: true,
      routeId: true,
      departureTime: true,
      fareTotal: true,
      seatsTotal: true,
      seatsAvailable: true,
      status: true,
    },
  });
  res.json({ ride: updated });
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  const ride = await prisma.ridePost.findUnique({ where: { id: req.params.id } });
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  if (ride.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });

  const updated = await prisma.ridePost.update({
    where: { id: ride.id },
    data: { status: "CANCELLED" },
    select: { id: true, status: true },
  });

  const requestsToNotify = await prisma.rideRequest.findMany({
    where: { ridePostId: ride.id, status: { in: ["PENDING", "ACCEPTED"] } },
    select: { passengerId: true },
  });

  await prisma.rideRequest.updateMany({
    where: { ridePostId: ride.id, status: { in: ["PENDING", "ACCEPTED"] } },
    data: { status: "CANCELLED" },
  });

  if (requestsToNotify.length > 0) {
    await prisma.notification.createMany({
      data: requestsToNotify.map((r) => ({
        userId: r.passengerId,
        type: "RIDE_CANCELLED",
        title: "Ride Cancelled",
        message: "A ride you requested has been cancelled by the ride organiser.",
        link: "/my-requests",
      })),
    });
  }

  res.json({ ride: updated });
});

router.post("/:id/start", requireAuth, async (req, res) => {
  const ride = await prisma.ridePost.findUnique({ where: { id: req.params.id } });
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  if (ride.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });
  if (!["OPEN", "FULL"].includes(ride.status)) {
    return res.status(400).json({ error: "Only OPEN or FULL rides can be started" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ridePost.update({
        where: { id: ride.id },
        data: { status: "IN_PROGRESS" },
        select: { id: true, status: true },
      });

      // Auto-reject any leftover PENDING requests
      const rejectedReqs = await tx.rideRequest.findMany({
        where: { ridePostId: ride.id, status: "PENDING" },
        select: { id: true, passengerId: true },
      });

      if (rejectedReqs.length > 0) {
        await tx.rideRequest.updateMany({
          where: { ridePostId: ride.id, status: "PENDING" },
          data: { status: "REJECTED" },
        });
        await tx.notification.createMany({
          data: rejectedReqs.map((r) => ({
            userId: r.passengerId,
            type: "REQUEST_REJECTED",
            title: "Ride Started",
            message: "The ride has started and your pending request was automatically declined.",
            link: "/my-requests",
          })),
        });
      }

      return updated;
    });

    // Notify accepted passengers
    const acceptedRequests = await prisma.rideRequest.findMany({
      where: { ridePostId: ride.id, status: "ACCEPTED" },
      select: { passengerId: true },
    });

    if (acceptedRequests.length > 0) {
      await prisma.notification.createMany({
        data: acceptedRequests.map((r) => ({
          userId: r.passengerId,
          type: "RIDE_STARTED",
          title: "Ride Started",
          message: "Your ride has started! The driver is on their way.",
          link: "/my-requests",
        })),
      });
    }

    res.json({ ride: result });
  } catch (e) {
    res.status(500).json({ error: "Failed to start ride" });
  }
});

router.post("/:id/complete", requireAuth, async (req, res) => {
  const ride = await prisma.ridePost.findUnique({ where: { id: req.params.id } });
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  if (ride.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });
  if (!["OPEN", "FULL", "IN_PROGRESS"].includes(ride.status)) {
    return res.status(400).json({ error: "Only active rides can be marked as completed" });
  }

  const updated = await prisma.ridePost.update({
    where: { id: ride.id },
    data: { status: "COMPLETED" },
    select: { id: true, status: true },
  });

  // Return accepted passengers so frontend can open the review modal immediately
  const acceptedRequests = await prisma.rideRequest.findMany({
    where: { ridePostId: ride.id, status: "ACCEPTED" },
    select: { passenger: { select: { id: true, fullName: true, avatarUrl: true, rating: true, reviewsCount: true } } },
  });

  if (acceptedRequests.length > 0) {
    await prisma.notification.createMany({
      data: acceptedRequests.map((r) => ({
        userId: r.passenger.id,
        type: "RIDE_COMPLETED",
        title: "Ride Completed",
        message: "Your ride has been marked as completed. Please leave a review!",
        link: "/dashboard",
      })),
    });
  }

  res.json({ ride: updated, passengers: acceptedRequests.map((r) => r.passenger) });
});

// ---- reviews ----
const reviewSchema = z.object({
  revieweeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(300).optional(),
});

router.get("/:id/reviews", requireAuth, async (req, res) => {
  const ride = await prisma.ridePost.findUnique({ where: { id: req.params.id } });
  if (!ride) return res.status(404).json({ error: "Ride not found" });

  const reviews = await prisma.review.findMany({
    where: { ridePostId: req.params.id },
    select: {
      id: true, rating: true, comment: true, createdAt: true,
      reviewerId: true, revieweeId: true,
      reviewer: { select: { id: true, fullName: true, avatarUrl: true, rating: true, reviewsCount: true } },
      reviewee: { select: { id: true, fullName: true, avatarUrl: true, rating: true, reviewsCount: true } },
    },
  });
  res.json({ reviews });
});

router.post("/:id/reviews", requireAuth, async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const ride = await prisma.ridePost.findUnique({
    where: { id: req.params.id },
    include: { requests: { where: { status: "ACCEPTED" } } },
  });
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  if (ride.status !== "COMPLETED") return res.status(400).json({ error: "Can only review completed rides" });

  const { revieweeId, rating, comment } = parsed.data;
  if (revieweeId === req.userId) return res.status(400).json({ error: "Cannot review yourself" });

  const isOwner = ride.ownerId === req.userId;
  const isPassenger = ride.requests.some((r) => r.passengerId === req.userId);
  if (!isOwner && !isPassenger) return res.status(403).json({ error: "You are not a participant of this ride" });

  const revieweeIsOwner = ride.ownerId === revieweeId;
  const revieweeIsPassenger = ride.requests.some((r) => r.passengerId === revieweeId);
  if (!revieweeIsOwner && !revieweeIsPassenger) {
    return res.status(400).json({ error: "Reviewee is not a participant of this ride" });
  }

  try {
    const review = await prisma.review.create({
      data: { ridePostId: ride.id, reviewerId: req.userId, revieweeId, rating, comment: comment || null },
      select: { id: true, rating: true, comment: true, createdAt: true, revieweeId: true },
    });

    const agg = await prisma.review.aggregate({
      where: { revieweeId },
      _avg: { rating: true },
      _count: { rating: true }
    });

    await prisma.user.update({
      where: { id: revieweeId },
      data: {
        rating: agg._avg.rating || 0,
        reviewsCount: agg._count.rating || 0
      }
    });

    await prisma.notification.create({
      data: {
        userId: revieweeId,
        type: "REVIEW_RECEIVED",
        title: "New Review Received",
        message: `You received a ${rating}-star review for a recent ride.`,
        link: "/profile",
      },
    });

    res.status(201).json({ review });
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "You already reviewed this person for this ride" });
    throw e;
  }
});

// ---- join requests ----
router.post("/:id/request", requireAuth, async (req, res) => {
  const ride = await prisma.ridePost.findUnique({ where: { id: req.params.id } });
  if (!ride) return res.status(404).json({ error: "Ride not found" });
  if (ride.ownerId === req.userId) return res.status(400).json({ error: "You cannot request your own ride" });
  if (ride.status !== "OPEN" || ride.seatsAvailable <= 0) return res.status(400).json({ error: "Ride not available" });

  try {
    const request = await prisma.rideRequest.create({
      data: { ridePostId: ride.id, passengerId: req.userId, status: "PENDING" },
      select: { id: true, status: true, createdAt: true },
    });

    await prisma.notification.create({
      data: {
        userId: ride.ownerId,
        type: "REQUEST_JOIN",
        title: "New Ride Request",
        message: "Someone has requested to join your ride.",
        link: "/dashboard",
      },
    });

    return res.status(201).json({ request });
  } catch (e) {
    return res.status(409).json({ error: "Request already exists" });
  }
});

router.get("/me/requests", requireAuth, async (req, res) => {
  const requests = await prisma.rideRequest.findMany({
    where: { passengerId: req.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      ridePost: {
        select: {
          id: true,
          routeId: true,
          departureTime: true,
          fareTotal: true,
          seatsTotal: true,
          seatsAvailable: true,
          status: true,
          owner: { select: { id: true, fullName: true, avatarUrl: true, rating: true, reviewsCount: true } },
        },
      },
    },
  });
  res.json({ requests });
});

const requestActionSchema = z.object({ id: z.string().min(1) });

router.post("/requests/:requestId/accept", requireAuth, async (req, res) => {
  const parsed = requestActionSchema.safeParse({ id: req.params.requestId });
  if (!parsed.success) return res.status(400).json({ error: "Invalid requestId" });

  const request = await prisma.rideRequest.findUnique({
    where: { id: parsed.data.id },
    include: { ridePost: true },
  });
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.ridePost.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });
  if (request.status !== "PENDING") return res.status(400).json({ error: "Only PENDING requests can be accepted" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ride = await tx.ridePost.findUnique({ where: { id: request.ridePostId } });
      if (!ride || ride.status !== "OPEN" || ride.seatsAvailable <= 0) {
        throw new Error("Ride not available");
      }

      const updatedReq = await tx.rideRequest.update({
        where: { id: request.id },
        data: { status: "ACCEPTED" },
        select: { id: true, status: true },
      });

      const updatedRide = await tx.ridePost.update({
        where: { id: ride.id },
        data: {
          seatsAvailable: { decrement: 1 },
        },
        select: { id: true, seatsAvailable: true, status: true },
      });

      const finalRide =
        updatedRide.seatsAvailable <= 0
          ? await tx.ridePost.update({
              where: { id: ride.id },
              data: { status: "FULL" },
              select: { id: true, seatsAvailable: true, status: true },
            })
          : updatedRide;

      return { request: updatedReq, ride: finalRide };
    });

    res.json(result);

    await prisma.notification.create({
      data: {
        userId: request.passengerId,
        type: "REQUEST_ACCEPTED",
        title: "Request Accepted",
        message: "Your ride request has been accepted by the ride organiser!",
        link: "/my-requests",
      },
    });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Could not accept request" });
  }
});

router.post("/requests/:requestId/reject", requireAuth, async (req, res) => {
  const request = await prisma.rideRequest.findUnique({
    where: { id: req.params.requestId },
    include: { ridePost: true },
  });
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.ridePost.ownerId !== req.userId) return res.status(403).json({ error: "Forbidden" });
  if (request.status !== "PENDING") return res.status(400).json({ error: "Only PENDING requests can be rejected" });

  const updated = await prisma.rideRequest.update({
    where: { id: request.id },
    data: { status: "REJECTED" },
    select: { id: true, status: true },
  });

  await prisma.notification.create({
    data: {
      userId: request.passengerId,
      type: "REQUEST_REJECTED",
      title: "Request Rejected",
      message: "Your ride request was declined by the ride organiser.",
      link: "/my-requests",
    },
  });

  res.json({ request: updated });
});

router.post("/requests/:requestId/cancel", requireAuth, async (req, res) => {
  const request = await prisma.rideRequest.findUnique({
    where: { id: req.params.requestId },
    include: { ridePost: true },
  });
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.passengerId !== req.userId) return res.status(403).json({ error: "Forbidden" });
  if (request.status !== "PENDING") return res.status(400).json({ error: "Only PENDING requests can be cancelled" });

  const updated = await prisma.rideRequest.update({
    where: { id: request.id },
    data: { status: "CANCELLED" },
    select: { id: true, status: true },
  });
  res.json({ request: updated });
});

export default router;

