-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'SEARCH', 'CART', 'LIKE', 'DISMISS', 'PURCHASE', 'REVIEW');

-- CreateTable
CREATE TABLE "UserInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonId" TEXT,
    "productRef" TEXT,
    "category" TEXT,
    "storeId" TEXT,
    "type" "InteractionType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "query" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserInteraction_userId_createdAt_idx" ON "UserInteraction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserInteraction_anonId_createdAt_idx" ON "UserInteraction"("anonId", "createdAt");

-- CreateIndex
CREATE INDEX "UserInteraction_productRef_type_idx" ON "UserInteraction"("productRef", "type");

-- CreateIndex
CREATE INDEX "UserInteraction_createdAt_idx" ON "UserInteraction"("createdAt");
