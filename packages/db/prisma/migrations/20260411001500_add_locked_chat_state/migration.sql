-- AlterTable
ALTER TABLE "conversation_participants" ADD COLUMN     "lockedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "conversation_participants_userId_lockedAt_idx" ON "conversation_participants"("userId", "lockedAt");

