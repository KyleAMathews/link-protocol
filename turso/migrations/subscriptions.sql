-- CreateTable
CREATE TABLE "Subscription" (
    "category" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdTimestamp" BIGINT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_category_userId" ON "Subscription"("category", "userId");

-- CreateIndex
CREATE INDEX "Subscription_guildId_idx" ON "Subscription"("guildId");
