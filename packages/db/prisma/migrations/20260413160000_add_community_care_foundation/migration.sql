-- CreateEnum
CREATE TYPE "CareRequestType" AS ENUM ('PRAYER', 'FOLLOW_UP', 'VISITATION', 'COUNSELING', 'SUPPORT', 'WELFARE', 'GUEST');

-- CreateEnum
CREATE TYPE "CareRequestVisibility" AS ENUM ('PRIVATE', 'CARE_TEAM', 'ROOM');

-- CreateEnum
CREATE TYPE "ConversationAnnouncementAudience" AS ENUM ('ROOM', 'LEADS_ONLY', 'CARE_TEAM', 'FOLLOW_UP_TEAM', 'NEW_GUESTS');

-- AlterTable
ALTER TABLE "conversation_tool_notes"
ADD COLUMN "audience" "ConversationAnnouncementAudience" NOT NULL DEFAULT 'ROOM',
ADD COLUMN "expires_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "conversation_prayer_requests"
ADD COLUMN "assigned_to_user_id" UUID,
ADD COLUMN "follow_up_at" TIMESTAMP(3),
ADD COLUMN "priority" "ConversationTaskPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "request_type" "CareRequestType" NOT NULL DEFAULT 'PRAYER',
ADD COLUMN "resolved_at" TIMESTAMP(3),
ADD COLUMN "subject_contact" TEXT,
ADD COLUMN "subject_name" TEXT,
ADD COLUMN "visibility" "CareRequestVisibility" NOT NULL DEFAULT 'CARE_TEAM';

UPDATE "conversation_prayer_requests"
SET "resolved_at" = "answered_at"
WHERE "status" = 'ANSWERED' AND "answered_at" IS NOT NULL;

-- CreateTable
CREATE TABLE "conversation_prayer_updates" (
    "id" UUID NOT NULL,
    "prayer_request_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_prayer_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_prayer_requests_conversation_id_visibility_update_idx" ON "conversation_prayer_requests"("conversationId", "visibility", "updatedAt");

-- CreateIndex
CREATE INDEX "conversation_prayer_requests_assigned_to_user_id_status_idx" ON "conversation_prayer_requests"("assigned_to_user_id", "status");

-- CreateIndex
CREATE INDEX "conversation_prayer_updates_prayer_request_id_created_at_idx" ON "conversation_prayer_updates"("prayer_request_id", "created_at");

-- CreateIndex
CREATE INDEX "conversation_prayer_updates_author_id_created_at_idx" ON "conversation_prayer_updates"("author_id", "created_at");

-- AddForeignKey
ALTER TABLE "conversation_prayer_requests" ADD CONSTRAINT "conversation_prayer_requests_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_prayer_updates" ADD CONSTRAINT "conversation_prayer_updates_prayer_request_id_fkey" FOREIGN KEY ("prayer_request_id") REFERENCES "conversation_prayer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_prayer_updates" ADD CONSTRAINT "conversation_prayer_updates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
