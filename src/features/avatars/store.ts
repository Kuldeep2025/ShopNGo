import { prisma } from "@/lib/db";

/**
 * Avatar storage in its own small table ("UserAvatar", created by an additive migration).
 * Raw SQL keeps the Prisma schema untouched. The table is also created on demand
 * so a pending migration never breaks the feature.
 */
let ensured = false;
async function ensureTable() {
  if (ensured || !prisma) return;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "UserAvatar" ("userId" TEXT NOT NULL, "image" TEXT, "aiAvatar" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("userId"))`
  );
  ensured = true;
}

export type AvatarRow = { image: string | null; aiAvatar: string | null };

export async function readAvatar(userId: string): Promise<AvatarRow> {
  if (!prisma) return { image: null, aiAvatar: null };
  await ensureTable();
  const rows = await prisma.$queryRaw<AvatarRow[]>`SELECT "image", "aiAvatar" FROM "UserAvatar" WHERE "userId" = ${userId}`;
  return rows[0] ?? { image: null, aiAvatar: null };
}

export async function writeImage(userId: string, image: string | null) {
  if (!prisma) return;
  await ensureTable();
  await prisma.$executeRaw`INSERT INTO "UserAvatar" ("userId","image","updatedAt") VALUES (${userId}, ${image}, NOW())
    ON CONFLICT ("userId") DO UPDATE SET "image" = EXCLUDED."image", "updatedAt" = NOW()`;
}

export async function writeAiAvatar(userId: string, aiAvatar: string) {
  if (!prisma) return;
  await ensureTable();
  await prisma.$executeRaw`INSERT INTO "UserAvatar" ("userId","aiAvatar","updatedAt") VALUES (${userId}, ${aiAvatar}, NOW())
    ON CONFLICT ("userId") DO UPDATE SET "aiAvatar" = EXCLUDED."aiAvatar", "updatedAt" = NOW()`;
}
