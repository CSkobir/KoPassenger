import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: ["error"],
  errorFormat: "minimal",
});

// Gracefully handle Neon's "serverless sleep" connection resets.
// Prisma will automatically reconnect on the next query, but we
// silence the unhandled rejection so the server doesn't restart.
process.on("unhandledRejection", (reason) => {
  const msg = String(reason?.message ?? reason);
  if (
    msg.includes("ECONNRESET") ||
    msg.includes("P1001") ||  // connection refused
    msg.includes("P2024")     // connection pool timeout
  ) {
    console.warn("[db] Neon connection dropped – will reconnect on next query.");
    return; // swallow, do NOT rethrow
  }
  // For any other unhandled rejection, log and let Node decide
  console.error("[unhandledRejection]", reason);
});
