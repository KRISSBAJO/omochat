DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ConversationBoardSprintStatus'
  ) THEN
    CREATE TYPE "ConversationBoardSprintStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
  END IF;
END $$;

ALTER TYPE "ConversationBoardSprintStatus" ADD VALUE IF NOT EXISTS 'PLANNED';
ALTER TYPE "ConversationBoardSprintStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "ConversationBoardSprintStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "ConversationBoardSprintStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "conversation_boards"
ADD COLUMN IF NOT EXISTS "code_prefix" TEXT NOT NULL DEFAULT 'ROOM',
ADD COLUMN IF NOT EXISTS "next_task_number" INTEGER NOT NULL DEFAULT 1;

UPDATE "conversation_boards"
SET "code_prefix" = COALESCE(
  NULLIF(UPPER(LEFT(REGEXP_REPLACE(COALESCE("title", ''), '[^A-Za-z0-9]+', '', 'g'), 4)), ''),
  'ROOM'
)
WHERE "code_prefix" IS NULL OR "code_prefix" = 'ROOM';

CREATE TABLE IF NOT EXISTS "conversation_board_sprints" (
  "id" UUID NOT NULL,
  "boardId" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "goal" TEXT,
  "status" "ConversationBoardSprintStatus" NOT NULL DEFAULT 'PLANNED',
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversation_board_sprints_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "conversation_tool_tasks"
ADD COLUMN IF NOT EXISTS "sprint_id" UUID,
ADD COLUMN IF NOT EXISTS "task_number" INTEGER,
ADD COLUMN IF NOT EXISTS "task_code" TEXT;

WITH ranked_tasks AS (
  SELECT
    task.id,
    board."code_prefix" AS code_prefix,
    ROW_NUMBER() OVER (
      PARTITION BY task."board_id"
      ORDER BY task."createdAt" ASC, task.id ASC
    ) AS ordinal
  FROM "conversation_tool_tasks" AS task
  INNER JOIN "conversation_boards" AS board
    ON board.id = task."board_id"
  WHERE task."board_id" IS NOT NULL
    AND task."task_number" IS NULL
)
UPDATE "conversation_tool_tasks" AS task
SET
  "task_number" = ranked_tasks.ordinal,
  "task_code" = CONCAT(ranked_tasks.code_prefix, '-', LPAD(ranked_tasks.ordinal::TEXT, 4, '0'))
FROM ranked_tasks
WHERE task.id = ranked_tasks.id;

UPDATE "conversation_boards" AS board
SET "next_task_number" = COALESCE(next_numbers.max_task_number, 0) + 1
FROM (
  SELECT "board_id", MAX("task_number") AS max_task_number
  FROM "conversation_tool_tasks"
  WHERE "board_id" IS NOT NULL
  GROUP BY "board_id"
) AS next_numbers
WHERE board.id = next_numbers."board_id";

CREATE INDEX IF NOT EXISTS "conversation_board_sprints_boardId_sort_order_idx"
  ON "conversation_board_sprints"("boardId", "sort_order");

CREATE INDEX IF NOT EXISTS "conversation_board_sprints_boardId_status_idx"
  ON "conversation_board_sprints"("boardId", "status");

CREATE INDEX IF NOT EXISTS "conversation_tool_tasks_board_id_sprint_id_status_idx"
  ON "conversation_tool_tasks"("board_id", "sprint_id", "status");

CREATE INDEX IF NOT EXISTS "conversation_tool_tasks_task_code_idx"
  ON "conversation_tool_tasks"("task_code");

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_tool_tasks_board_id_task_number_key"
  ON "conversation_tool_tasks"("board_id", "task_number");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_board_sprints_boardId_fkey'
  ) THEN
    ALTER TABLE "conversation_board_sprints"
    ADD CONSTRAINT "conversation_board_sprints_boardId_fkey"
      FOREIGN KEY ("boardId") REFERENCES "conversation_boards"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_board_sprints_created_by_id_fkey'
  ) THEN
    ALTER TABLE "conversation_board_sprints"
    ADD CONSTRAINT "conversation_board_sprints_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_tool_tasks_sprint_id_fkey'
  ) THEN
    ALTER TABLE "conversation_tool_tasks"
    ADD CONSTRAINT "conversation_tool_tasks_sprint_id_fkey"
      FOREIGN KEY ("sprint_id") REFERENCES "conversation_board_sprints"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
