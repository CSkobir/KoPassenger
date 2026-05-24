import express, { Router } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { Server as SocketServer } from "socket.io";
import { assertEnv, config } from "./config.js";
import { trimBody } from "./middleware/parseBody.js";
import { verifyAccessToken } from "./utils/tokens.js";
import { prisma } from "./db.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import routesRoutes from "./routes/routes.js";
import rideRoutes from "./routes/rides.js";
import routinesRoutes from "./routes/routines.js";
import notificationsRoutes from "./routes/notifications.js";
import messagesRoutes from "./routes/messages.js";
import { startRoutineGenerationJob } from "./jobs/routineGeneration.js";

// ── Global async error wrapper ────────────────────────────────────────────────
// Automatically wraps every async route handler so that any unhandled
// promise rejection (e.g. Neon DB connection drop) is forwarded to the
// Express error handler instead of crashing the process.
const METHODS = ["get", "post", "put", "patch", "delete", "options", "head", "all"];
METHODS.forEach((method) => {
  const original = Router[method] ? Router[method].bind(Router) : null;
  const proto = Router.prototype;
  if (!proto[method]) return;
  const orig = proto[method];
  proto[method] = function (...args) {
    const wrappedArgs = args.map((arg) => {
      if (typeof arg !== "function" || arg.length === 4) return arg; // skip error handlers
      return function asyncWrapper(req, res, next) {
        const result = arg.call(this, req, res, next);
        if (result && typeof result.catch === "function") {
          result.catch(next);
        }
      };
    });
    return orig.apply(this, wrappedArgs);
  };
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  assertEnv();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const app = express();
const httpServer = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.frontendOrigin,
    credentials: true,
  },
});

// Auth middleware for socket connections
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.cookie
      ?.split(";")
      .find((c) => c.trim().startsWith("access_token="))
      ?.split("=")[1];

  if (!token) return next(new Error("Unauthorized"));
  try {
    const payload = verifyAccessToken(token);
    socket.userId = payload.sub;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  // Client joins a room keyed by rideRequestId
  socket.on("join_room", (rideRequestId) => {
    socket.join(rideRequestId);
  });

  socket.on("leave_room", (rideRequestId) => {
    socket.leave(rideRequestId);
  });

  // Send a message via socket (real-time path)
  socket.on("send_message", async ({ rideRequestId, content }) => {
    if (!rideRequestId || !content?.trim()) return;

    try {
      // Verify participant
      const rr = await prisma.rideRequest.findUnique({
        where: { id: rideRequestId },
        select: {
          passengerId: true,
          status: true,
          ridePost: { select: { ownerId: true } },
        },
      });
      if (!rr) return;
      if (rr.status === "REJECTED" || rr.status === "CANCELLED") return;

      const isParticipant =
        rr.passengerId === socket.userId || rr.ridePost.ownerId === socket.userId;
      if (!isParticipant) return;

      const message = await prisma.message.create({
        data: {
          rideRequestId,
          senderId: socket.userId,
          content: content.trim().slice(0, 1000),
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

      // Broadcast to everyone in the room (including sender)
      io.to(rideRequestId).emit("new_message", { rideRequestId, message });
    } catch (err) {
      console.error("socket send_message error:", err);
    }
  });
});

// Attach io to app so routes can use it if needed
app.set("io", io);

// ── HTTP Middleware ───────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(trimBody);

const uploadsPath = path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(uploadsPath));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/routes", routesRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/routines", routinesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/messages", messagesRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  const code = err?.code ?? "";
  const msg = err?.message ?? "";
  // Neon DB sleep / connection pool timeout
  if (
    code === "P1001" || code === "P2024" ||
    msg.includes("ECONNRESET") || msg.includes("connection pool")
  ) {
    console.warn("[db] Connection error (Neon may be sleeping):", msg);
    return res.status(503).json({ error: "Database is waking up. Please try again in a moment." });
  }
  console.error("[server error]", err);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize cron jobs
startRoutineGenerationJob();

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n[ERROR] Port ${config.port} is already in use!`);
    console.error(`Another process is already running on this port.`);
    console.error(`To fix this:`);
    console.error(`  1. Kill the process running on port ${config.port}:`);
    console.error(`     - Linux/macOS: kill -9 $(lsof -t -i:${config.port})`);
    console.error(`     - Windows (CMD): for /f "tokens=5" %a in ('netstat -aon ^| findstr :${config.port}') do taskkill /f /pid %a`);
    console.error(`  2. Or change the PORT variable in your 'server/.env' file to something else (e.g. PORT=4001).\n`);
    process.exit(1);
  } else {
    console.error("\n[SERVER ERROR]", err);
    process.exit(1);
  }
});

httpServer.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
