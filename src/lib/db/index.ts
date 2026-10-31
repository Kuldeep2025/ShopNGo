/**
 * Prisma client singleton.
 * Returns null when DATABASE_URL is missing or still a placeholder.
 * Never throws on import – callers must handle null.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient(): PrismaClient | null {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("USER:PASSWORD") || url.includes("REPLACE_ME")) {
    return null;
  }

  return globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = createClient();

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export function isDatabaseConfigured(): boolean {
  return prisma !== null;
}
