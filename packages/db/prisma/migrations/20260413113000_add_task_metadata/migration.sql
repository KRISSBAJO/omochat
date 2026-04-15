-- CreateEnum
CREATE TYPE "ConversationTaskType" AS ENUM ('TASK', 'FEATURE', 'BUG', 'IMPROVEMENT', 'FOLLOW_UP', 'REQUEST');

-- CreateEnum
CREATE TYPE "ConversationTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "conversation_tool_tasks"
ADD COLUMN "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "priority" "ConversationTaskPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "score" INTEGER,
ADD COLUMN "sprint_name" TEXT,
ADD COLUMN "story_points" INTEGER,
ADD COLUMN "task_type" "ConversationTaskType" NOT NULL DEFAULT 'TASK';
