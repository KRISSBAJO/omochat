-- CreateEnum
CREATE TYPE "ConversationCategory" AS ENUM ('GENERAL', 'CHURCH', 'WORKSPACE', 'COMMUNITY', 'DEPARTMENT', 'CARE_TEAM');

-- AlterEnum
ALTER TYPE "ConversationToolPack" ADD VALUE IF NOT EXISTS 'BOARDS';

-- CreateEnum
CREATE TYPE "ConversationBoardTemplate" AS ENUM ('KANBAN', 'SPRINT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ConversationBoardMemberRole" AS ENUM ('MANAGER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER');

-- AlterTable
ALTER TABLE "conversations"
ADD COLUMN "category" "ConversationCategory" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "conversation_tool_tasks"
ADD COLUMN "board_id" UUID,
ADD COLUMN "column_id" UUID,
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "conversation_boards" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "template" "ConversationBoardTemplate" NOT NULL DEFAULT 'KANBAN',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_board_columns" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "task_status" "ConversationTaskStatus" NOT NULL DEFAULT 'TODO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_board_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_board_members" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "added_by_user_id" UUID,
    "role" "ConversationBoardMemberRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_board_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_boards_conversationId_createdAt_idx" ON "conversation_boards"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_boards_conversationId_is_default_idx" ON "conversation_boards"("conversationId", "is_default");

-- CreateIndex
CREATE INDEX "conversation_board_columns_boardId_sort_order_idx" ON "conversation_board_columns"("boardId", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_board_members_boardId_userId_key" ON "conversation_board_members"("boardId", "userId");

-- CreateIndex
CREATE INDEX "conversation_board_members_boardId_role_idx" ON "conversation_board_members"("boardId", "role");

-- CreateIndex
CREATE INDEX "conversation_board_members_userId_createdAt_idx" ON "conversation_board_members"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_tool_tasks_board_id_column_id_sort_order_idx" ON "conversation_tool_tasks"("board_id", "column_id", "sort_order");

-- AddForeignKey
ALTER TABLE "conversation_boards" ADD CONSTRAINT "conversation_boards_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_boards" ADD CONSTRAINT "conversation_boards_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_board_columns" ADD CONSTRAINT "conversation_board_columns_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "conversation_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_board_members" ADD CONSTRAINT "conversation_board_members_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "conversation_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_board_members" ADD CONSTRAINT "conversation_board_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_board_members" ADD CONSTRAINT "conversation_board_members_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_tasks" ADD CONSTRAINT "conversation_tool_tasks_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "conversation_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_tool_tasks" ADD CONSTRAINT "conversation_tool_tasks_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "conversation_board_columns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
