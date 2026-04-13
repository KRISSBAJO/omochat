-- CreateEnum
CREATE TYPE "DirectMessagePolicy" AS ENUM ('OPEN', 'REQUESTS_ONLY');

-- CreateEnum
CREATE TYPE "DirectMessageRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dmPolicy" "DirectMessagePolicy" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "direct_message_requests" (
    "id" UUID NOT NULL,
    "requesterUserId" UUID NOT NULL,
    "recipientUserId" UUID NOT NULL,
    "conversationId" UUID,
    "initialMessage" TEXT,
    "status" "DirectMessageRequestStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_message_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "direct_message_requests_requesterUserId_status_idx" ON "direct_message_requests"("requesterUserId", "status");

-- CreateIndex
CREATE INDEX "direct_message_requests_recipientUserId_status_idx" ON "direct_message_requests"("recipientUserId", "status");

-- CreateIndex
CREATE INDEX "direct_message_requests_conversationId_idx" ON "direct_message_requests"("conversationId");

-- CreateIndex
CREATE INDEX "users_dmPolicy_idx" ON "users"("dmPolicy");

-- AddForeignKey
ALTER TABLE "direct_message_requests" ADD CONSTRAINT "direct_message_requests_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_message_requests" ADD CONSTRAINT "direct_message_requests_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_message_requests" ADD CONSTRAINT "direct_message_requests_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

