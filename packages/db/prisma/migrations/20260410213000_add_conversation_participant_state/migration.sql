-- AlterTable
ALTER TABLE "conversation_participants"
ADD COLUMN "lastReadAt" TIMESTAMP(3),
ADD COLUMN "lastReadMessageId" UUID,
ADD COLUMN "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "conversation_participants_userId_archivedAt_idx"
ON "conversation_participants"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "conversation_participants_userId_pinnedAt_idx"
ON "conversation_participants"("userId", "pinnedAt");
