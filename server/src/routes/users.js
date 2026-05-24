import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { z } from "zod";
import validator from "validator";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { sanitizeEmail, sanitizePlainText, sanitizeString } from "../utils/sanitize.js";
import { getCookieBaseOptions } from "../utils/cookies.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.join(__dirname, "..", "..", "uploads", "avatars");

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Only image files are allowed"), ok);
  },
});

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      emailNotifications: true,
      theme: true,
      createdAt: true,
    },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ user });
});

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const data = {};
  if (parsed.data.fullName !== undefined) {
    data.fullName = sanitizePlainText(parsed.data.fullName, 200);
  }
  if (parsed.data.email !== undefined) {
    const email = sanitizeEmail(parsed.data.email);
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id: req.userId } },
    });
    if (taken) {
      return res.status(409).json({ error: "Email already in use" });
    }
    data.email = email;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No changes" });
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      emailNotifications: true,
      theme: true,
    },
  });

  return res.json({ user, message: "Profile updated." });
});

router.post("/me/avatar", requireAuth, (req, res) => {
  upload.single("avatar")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file" });
    }

    const relative = `/uploads/avatars/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: relative },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        emailNotifications: true,
        theme: true,
      },
    });

    return res.json({ user, message: "Avatar updated." });
  });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

router.patch("/me/password", requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: req.userId },
    data: { passwordHash },
  });

  await prisma.refreshToken.deleteMany({ where: { userId: req.userId } });

  const opts = getCookieBaseOptions();
  res.clearCookie("access_token", opts);
  res.clearCookie("refresh_token", opts);

  return res.json({ message: "Password changed. Please sign in again." });
});

const settingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

router.patch("/me/settings", requireAuth, async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const data = {};
  if (parsed.data.emailNotifications !== undefined) {
    data.emailNotifications = parsed.data.emailNotifications;
  }
  if (parsed.data.theme !== undefined) {
    data.theme = parsed.data.theme;
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No changes" });
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      emailNotifications: true,
      theme: true,
    },
  });

  return res.json({ user, message: "Settings saved." });
});

router.delete("/me", requireAuth, async (req, res) => {
  const schema = z.object({
    password: z.string().min(1),
    confirm: z.literal("DELETE"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Confirmation required. Send password and confirm: DELETE" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid password" });
  }

  await prisma.user.delete({ where: { id: req.userId } });

  const opts = getCookieBaseOptions();
  res.clearCookie("access_token", opts);
  res.clearCookie("refresh_token", opts);

  return res.json({ message: "Account deleted." });
});

router.get("/me/reviews", requireAuth, async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { revieweeId: req.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, rating: true, comment: true, createdAt: true,
      reviewer: { select: { id: true, fullName: true, avatarUrl: true } },
      ridePost: { select: { id: true, routeId: true, departureTime: true } },
    },
  });

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  res.json({ reviews, averageRating: avg, totalReviews: reviews.length });
});
router.get("/:id/public", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      rating: true,
      reviewsCount: true,
      createdAt: true,
    },
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  const reviews = await prisma.review.findMany({
    where: { revieweeId: req.params.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, rating: true, comment: true, createdAt: true,
      reviewer: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  res.json({ user, reviews });
});

export default router;
