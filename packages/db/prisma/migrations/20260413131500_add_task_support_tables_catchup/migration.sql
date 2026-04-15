CREATE TABLE IF NOT EXISTS "conversation_tool_task_comments" (
  "id" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "parent_id" UUID,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "conversation_tool_task_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "conversation_tool_task_watchers" (
  "id" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_tool_task_watchers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "conversation_tool_task_likes" (
  "id" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_tool_task_likes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "conversation_tool_task_attachments" (
  "id" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "uploaded_by_id" UUID NOT NULL,
  "provider" "MediaProvider" NOT NULL DEFAULT 'CLOUDINARY',
  "bucket" TEXT,
  "storage_key" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "duration_ms" INTEGER,
  "checksum" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_tool_task_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_tool_task_watchers_taskId_userId_key"
  ON "conversation_tool_task_watchers"("taskId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_tool_task_likes_taskId_userId_key"
  ON "conversation_tool_task_likes"("taskId", "userId");

CREATE INDEX IF NOT EXISTS "conversation_tool_task_comments_taskId_createdAt_idx"
  ON "conversation_tool_task_comments"("taskId", "createdAt");

CREATE INDEX IF NOT EXISTS "conversation_tool_task_comments_author_id_createdAt_idx"
  ON "conversation_tool_task_comments"("author_id", "createdAt");

CREATE INDEX IF NOT EXISTS "conversation_tool_task_comments_parent_id_idx"
  ON "conversation_tool_task_comments"("parent_id");

CREATE INDEX IF NOT EXISTS "conversation_tool_task_watchers_userId_createdAt_idx"
  ON "conversation_tool_task_watchers"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "conversation_tool_task_likes_userId_createdAt_idx"
  ON "conversation_tool_task_likes"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "conversation_tool_task_attachments_taskId_createdAt_idx"
  ON "conversation_tool_task_attachments"("taskId", "createdAt");

CREATE INDEX IF NOT EXISTS "conversation_tool_task_attachments_uploaded_by_id_createdAt_idx"
  ON "conversation_tool_task_attachments"("uploaded_by_id", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_tool_task_comments_taskId_fkey'
  ) THEN
    ALTER TABLE "conversation_tool_task_comments"
    ADD CONSTRAINT "conversation_tool_task_comments_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "conversation_tool_tasks"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_tool_task_comments_author_id_fkey'
  ) THEN
    ALTER TABLE "conversation_tool_task_comments"
    ADD CONSTRAINT "conversation_tool_task_comments_author_id_fkey"
      FOREIGN KEY ("author_id") REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_tool_task_comments_parent_id_fkey'
  ) THEN
    ALTER TABLE "conversation_tool_task_comments"
    ADD CONSTRAINT "conversation_tool_task_comments_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "conversation_tool_task_comments"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_tool_task_watchers_taskId_fkey'
  ) THEN
    ALTER TABLE "conversation_tool_task_watchers"
    ADD CONSTRAINT "conversation_tool_task_watchers_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "conversation_tool_tasks"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_tool_task_watchers_userId_fkey'
  ) THEN
    ALTER TABLE "conversation_tool_task_watchers"
    ADD CONSTRAINT "conversation_tool_task_watchers_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_tool_task_likes_taskId_fkey'
  ) THEN
    ALTER TABLE "conversation_tool_task_likes"
    ADD CONSTRAINT "conversation_tool_task_likes_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "conversation_tool_tasks"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_tool_task_likes_userId_fkey'
  ) THEN
    ALTER TABLE "conversation_tool_task_likes"
    ADD CONSTRAINT "conversation_tool_task_likes_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_tool_task_attachments_taskId_fkey'
  ) THEN
    ALTER TABLE "conversation_tool_task_attachments"
    ADD CONSTRAINT "conversation_tool_task_attachments_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "conversation_tool_tasks"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_tool_task_attachments_uploaded_by_id_fkey'
  ) THEN
    ALTER TABLE "conversation_tool_task_attachments"
    ADD CONSTRAINT "conversation_tool_task_attachments_uploaded_by_id_fkey"
      FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
