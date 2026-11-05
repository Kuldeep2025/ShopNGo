-- Additive: per-user profile picture (small data URL) and chosen AI avatar.
CREATE TABLE IF NOT EXISTS "UserAvatar" (
  "userId" TEXT NOT NULL,
  "image" TEXT,
  "aiAvatar" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("userId")
);
