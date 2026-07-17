import { PrismaClient, Prisma } from "@prisma/client";
import { isProd } from "./env.js";
import { logger } from "./logger.js";

// Neon's serverless free tier auto-suspends after inactivity, so the first query
// after idle can fail with a connection error before the compute wakes. We retry
// transient connection failures transparently so the app (and demo) stays solid.
function isTransient(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /Can't reach database server|ECONNRESET|ECONNREFUSED|Closed|Connection terminated|timed out/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createClient() {
  const base = new PrismaClient({ log: isProd ? ["error"] : ["error", "warn"] });
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        const maxAttempts = 3;
        let lastErr: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            lastErr = err;
            if (isTransient(err) && attempt < maxAttempts) {
              logger.warn({ attempt }, "Transient DB error - retrying (Neon may be waking up)");
              await sleep(400 * attempt);
              continue;
            }
            throw err;
          }
        }
        throw lastErr;
      },
    },
  });
}

type ExtendedPrisma = ReturnType<typeof createClient>;

// Reuse a single client across hot reloads in dev to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrisma };

export const prisma = globalForPrisma.prisma ?? createClient();

if (!isProd) globalForPrisma.prisma = prisma;
