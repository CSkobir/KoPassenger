import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import validator from "validator";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  randomTokenBytes,
  hashToken,
} from "../utils/tokens.js";
import { sanitizeEmail, sanitizePlainText } from "../utils/sanitize.js";
import { getCookieBaseOptions } from "../utils/cookies.js";

const router = Router();

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

function cookieOptions() {
  return getCookieBaseOptions();
}

function setAuthCookies(res, userId, refreshJti) {
  const accessToken = signAccessToken({ sub: userId });
  const refreshToken = signRefreshToken({ sub: userId, jti: refreshJti });
  res.cookie("access_token", accessToken, {
    ...cookieOptions(),
    maxAge: config.accessTokenExpiresMs,
  });
  res.cookie("refresh_token", refreshToken, {
    ...cookieOptions(),
    maxAge: config.refreshTokenExpiresMs,
  });
}

const registerSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

router.post("/register", strictAuthLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  let { fullName, email, password } = parsed.data;
  fullName = sanitizePlainText(fullName, 200);
  email = sanitizeEmail(email);
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, fullName, passwordHash },
  });

  const jti = randomTokenBytes(24);
  const expiresAt = new Date(Date.now() + config.refreshTokenExpiresMs);
  await prisma.refreshToken.create({
    data: { jti, userId: user.id, expiresAt },
  });

  setAuthCookies(res, user.id, jti);
  return res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      emailNotifications: user.emailNotifications,
      theme: user.theme,
    },
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

router.post("/login", strictAuthLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  let { email, password } = parsed.data;
  email = sanitizeEmail(email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  const jti = randomTokenBytes(24);
  const expiresAt = new Date(Date.now() + config.refreshTokenExpiresMs);
  await prisma.refreshToken.create({
    data: { jti, userId: user.id, expiresAt },
  });

  setAuthCookies(res, user.id, jti);
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      emailNotifications: user.emailNotifications,
      theme: user.theme,
    },
  });
});

router.post("/logout", async (req, res) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (rt) {
      const payload = verifyRefreshToken(rt);
      if (payload?.jti) {
        await prisma.refreshToken.deleteMany({ where: { jti: payload.jti } });
      }
    }
  } catch {
    /* ignore */
  }
  res.clearCookie("access_token", cookieOptions());
  res.clearCookie("refresh_token", cookieOptions());
  return res.json({ ok: true });
});

router.post("/refresh", refreshLimiter, async (req, res) => {
  const refreshCookie = req.cookies?.refresh_token;
  if (!refreshCookie) {
    return res.status(401).json({ error: "No refresh token" });
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshCookie);
  } catch {
    res.clearCookie("access_token", cookieOptions());
    res.clearCookie("refresh_token", cookieOptions());
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const { sub: userId, jti } = payload;
  if (!userId || !jti) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const existing = await prisma.refreshToken.findUnique({ where: { jti } });
  if (!existing || existing.userId !== userId || existing.expiresAt < new Date()) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    res.clearCookie("access_token", cookieOptions());
    res.clearCookie("refresh_token", cookieOptions());
    return res.status(401).json({ error: "Refresh token revoked or expired" });
  }

  const newJti = randomTokenBytes(24);
  const expiresAt = new Date(Date.now() + config.refreshTokenExpiresMs);

  try {
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { jti } }),
      prisma.refreshToken.create({
        data: { jti: newJti, userId, expiresAt },
      }),
    ]);
  } catch (err) {
    // If P2025 (Record not found) happens, it means a concurrent request already rotated the token.
    // It's safe to just ignore and let the user re-authenticate or use the other request's cookies.
    if (err.code !== 'P2025') {
      console.error("Token rotation failed:", err);
    }
  }

  setAuthCookies(res, userId, newJti);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return res.json({
    user: user
      ? {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          emailNotifications: user.emailNotifications,
          theme: user.theme,
        }
      : null,
  });
});

const forgotSchema = z.object({
  email: z.string().email(),
});

router.post("/forgot-password", strictAuthLimiter, async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email" });
  }
  const email = sanitizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const rawToken = randomTokenBytes(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });
    const resetUrl = `${config.frontendOrigin}/reset-password?token=${encodeURIComponent(rawToken)}`;
    if (config.nodeEnv !== "production") {
      console.info("[dev] Password reset link:", resetUrl);
    }
  }

  return res.json({
    message: "If an account exists for that email, a reset link has been sent.",
  });
});

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

router.post("/reset-password", strictAuthLimiter, async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ error: "Invalid or expired reset link" });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.delete({ where: { id: record.id } }),
    prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  res.clearCookie("access_token", cookieOptions());
  res.clearCookie("refresh_token", cookieOptions());

  return res.json({ message: "Password updated. You can sign in now." });
});

export default router;
