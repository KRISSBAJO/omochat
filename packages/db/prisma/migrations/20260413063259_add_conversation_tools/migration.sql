-- CreateEnum
CREATE TYPE "ConversationToolPack" AS ENUM ('CORE_WORKSPACE', 'COMMUNITY_CARE');

-- CreateEnum
CREATE TYPE "ConversationToolRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ConversationNoteKind" AS ENUM ('NOTE', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ConversationTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "PrayerRequestStatus" AS ENUM ('OPEN', 'ANSWERED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "conversation_tool_requests" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "reviewed_by_user_id" UUID,
    "pack" "ConversationToolPack" NOT NULL,
    "status" "ConversationToolRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_tool_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_tool_activations" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "activated_by_user_id" UUID,
    "pack" "ConversationToolPack" NOT NULL,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_tool_activations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_tool_notes" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "updatedById" UUID,
    "kind" "ConversationNoteKind" NOT NULL DEFAULT 'NOTE',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_tool_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_tool_tasks" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "assigned_to_user_id" UUID,
    "source_message_id" UUID,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "category" TEXT,
    "status" "ConversationTaskStatus" NOT NULL DEFAULT 'TODO',
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_tool_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_tool_polls" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "conversation_tool_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_tool_poll_options" (
    "id" UUID NOT NULL,
    "pollId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_tool_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_tool_poll_votes" (
    "id" UUID NOT NULL,
    "pollId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_tool_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_prayer_requests" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "PrayerRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "answered_at" TIMESTAMP(3),

    CONSTRAINT "conversation_prayer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_prayer_supports" (
    "id" UUID NOT NULL,
    "prayer_request_id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_prayer_supports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_tool_requests_conversationId_createdAt_idx" ON "conversation_tool_requests"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_tool_requests_status_createdAt_idx" ON "conversation_tool_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_tool_activations_pack_activated_at_idx" ON "conversation_tool_activations"("pack", "activated_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_tool_activations_conversationId_pack_key" ON "conversation_tool_activations"("conversationId", "pack");

-- CreateIndex
CREATE INDEX "conversation_tool_notes_conversationId_kind_updatedAt_idx" ON "conversation_tool_notes"("conversationId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "conversation_tool_notes_conversationId_pinned_at_idx" ON "conversation_tool_notes"("conversationId", "pinned_at");

-- CreateIndex
CREATE INDEX "conversation_tool_tasks_conversationId_status_updatedAt_idx" ON "conversation_tool_tasks"("conversationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "conversation_tool_tasks_assigned_to_user_id_status_idx" ON "conversation_tool_tasks"("assigned_to_user_id", "status");

-- CreateIndex
CREATE INDEX "conversation_tool_tasks_source_message_id_idx" ON "conversation_tool_tasks"("source_message_id");

-- CreateIndex
CREATE INDEX "conversation_tool_polls_conversationId_createdAt_idx" ON "conversation_tool_polls"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_tool_polls_conversationId_closed_at_idx" ON "conversation_tool_polls"("conversationId", "closed_at");

-- CreateIndex
CREATE INDEX "conversation_tool_poll_options_pollId_sort_order_idx" ON "conversation_tool_poll_options"("pollId", "sort_order");

-- CreateIndex
CREATE INDEX "conversation_tool_poll_votes_optionId_createdAt_idx" ON "conversation_tool_poll_votes"("optionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_tool_poll_votes_pollId_userId_key" ON "conversation_tool_poll_votes"("pollId", "userId");

-- CreateIndex
CREATE INDEX "conversation_prayer_requests_conversationId_status_updatedA_idx" ON "conversation_prayer_requests"("conversationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "conversation_prayer_supports_userId_createdAt_idx" ON "conversation_prayer_supports"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_prayer_supports_prayer_request_id_userId_key" ON "conversation_prayer_supports"("prayer_request_id", "userId");

-- AddForeignKey
ALTER TABLE "conversation_tool_requests" ADD CONSTRAINT "conversation_tool_requests_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_requests" ADD CONSTRAINT "conversation_tool_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_requests" ADD CONSTRAINT "conversation_tool_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_activations" ADD CONSTRAINT "conversation_tool_activations_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_activations" ADD CONSTRAINT "conversation_tool_activations_activated_by_user_id_fkey" FOREIGN KEY ("activated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_notes" ADD CONSTRAINT "conversation_tool_notes_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_notes" ADD CONSTRAINT "conversation_tool_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_notes" ADD CONSTRAINT "conversation_tool_notes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_tasks" ADD CONSTRAINT "conversation_tool_tasks_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_tasks" ADD CONSTRAINT "conversation_tool_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_tasks" ADD CONSTRAINT "conversation_tool_tasks_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_tasks" ADD CONSTRAINT "conversation_tool_tasks_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_polls" ADD CONSTRAINT "conversation_tool_polls_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_polls" ADD CONSTRAINT "conversation_tool_polls_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_poll_options" ADD CONSTRAINT "conversation_tool_poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "conversation_tool_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_poll_votes" ADD CONSTRAINT "conversation_tool_poll_votes_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "conversation_tool_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_poll_votes" ADD CONSTRAINT "conversation_tool_poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "conversation_tool_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_poll_votes" ADD CONSTRAINT "conversation_tool_poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_prayer_requests" ADD CONSTRAINT "conversation_prayer_requests_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_prayer_requests" ADD CONSTRAINT "conversation_prayer_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_prayer_supports" ADD CONSTRAINT "conversation_prayer_supports_prayer_request_id_fkey" FOREIGN KEY ("prayer_request_id") REFERENCES "conversation_prayer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_prayer_supports" ADD CONSTRAINT "conversation_prayer_supports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
