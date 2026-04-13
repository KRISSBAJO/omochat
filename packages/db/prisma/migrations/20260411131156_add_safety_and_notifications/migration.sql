-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'MESSAGE_REQUEST', 'MESSAGE_REQUEST_ACCEPTED', 'MESSAGE_REQUEST_DECLINED', 'USER_BLOCKED', 'USER_REPORTED');

-- CreateEnum
CREATE TYPE "UserReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "contextId" TEXT,
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM';

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" UUID NOT NULL,
    "blockerUserId" UUID NOT NULL,
    "blockedUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reports" (
    "id" UUID NOT NULL,
    "reporterUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "conversationId" UUID,
    "messageId" UUID,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "UserReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_blocks_blockerUserId_idx" ON "user_blocks"("blockerUserId");

-- CreateIndex
CREATE INDEX "user_blocks_blockedUserId_idx" ON "user_blocks"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerUserId_blockedUserId_key" ON "user_blocks"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE INDEX "user_reports_reporterUserId_status_idx" ON "user_reports"("reporterUserId", "status");

-- CreateIndex
CREATE INDEX "user_reports_targetUserId_status_idx" ON "user_reports"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "user_reports_conversationId_idx" ON "user_reports"("conversationId");

-- CreateIndex
CREATE INDEX "user_reports_messageId_idx" ON "user_reports"("messageId");

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
