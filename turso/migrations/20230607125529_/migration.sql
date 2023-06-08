-- CreateTable
CREATE TABLE "Message" (
    "messageId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdTimestamp" BIGINT NOT NULL,
    "editedTimestamp" BIGINT,
    "links" TEXT,
    "reactions" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Message_messageId_key" ON "Message"("messageId");

-- CreateIndex
CREATE INDEX "Message_guildId_idx" ON "Message"("guildId");
