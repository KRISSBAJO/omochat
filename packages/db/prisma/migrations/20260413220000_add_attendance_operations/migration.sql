DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ConversationAttendanceLeaveType'
  ) THEN
    CREATE TYPE "ConversationAttendanceLeaveType" AS ENUM (
      'VACATION',
      'SICK',
      'PERSONAL',
      'COMPASSIONATE',
      'MINISTRY',
      'HOLIDAY',
      'UNPAID',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ConversationAttendanceLeaveStatus'
  ) THEN
    CREATE TYPE "ConversationAttendanceLeaveStatus" AS ENUM (
      'DRAFT',
      'PENDING',
      'APPROVED',
      'DECLINED',
      'CANCELLED'
    );
  END IF;
END $$;

ALTER TABLE "conversation_attendance_shifts"
  ADD COLUMN IF NOT EXISTS "station_code" TEXT;

ALTER TABLE "conversation_attendance_clock_events"
  ADD COLUMN IF NOT EXISTS "station_code" TEXT,
  ADD COLUMN IF NOT EXISTS "device_label" TEXT;

CREATE TABLE IF NOT EXISTS "conversation_attendance_policies" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "updated_by_id" UUID,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "standard_hours_per_day" INTEGER NOT NULL DEFAULT 8,
  "standard_hours_per_week" INTEGER NOT NULL DEFAULT 40,
  "overtime_after_minutes" INTEGER NOT NULL DEFAULT 480,
  "double_time_after_minutes" INTEGER NOT NULL DEFAULT 720,
  "late_grace_minutes" INTEGER NOT NULL DEFAULT 10,
  "break_required_after_minutes" INTEGER NOT NULL DEFAULT 360,
  "break_duration_minutes" INTEGER NOT NULL DEFAULT 30,
  "allow_self_clock" BOOLEAN NOT NULL DEFAULT true,
  "allow_manual_adjustments" BOOLEAN NOT NULL DEFAULT true,
  "require_supervisor_approval" BOOLEAN NOT NULL DEFAULT true,
  "require_location" BOOLEAN NOT NULL DEFAULT false,
  "require_photo" BOOLEAN NOT NULL DEFAULT false,
  "require_qr" BOOLEAN NOT NULL DEFAULT false,
  "require_nfc" BOOLEAN NOT NULL DEFAULT false,
  "station_label" TEXT,
  "station_code" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversation_attendance_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_attendance_policies_conversationId_key"
  ON "conversation_attendance_policies"("conversationId");

CREATE INDEX IF NOT EXISTS "conversation_attendance_policies_conversationId_idx"
  ON "conversation_attendance_policies"("conversationId");

CREATE TABLE IF NOT EXISTS "conversation_attendance_holidays" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "policy_id" UUID,
  "created_by_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "starts_on" TIMESTAMP(3) NOT NULL,
  "ends_on" TIMESTAMP(3) NOT NULL,
  "is_paid" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversation_attendance_holidays_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "conversation_attendance_holidays_conversationId_starts_on_idx"
  ON "conversation_attendance_holidays"("conversationId", "starts_on");

CREATE INDEX IF NOT EXISTS "conversation_attendance_holidays_policy_id_starts_on_idx"
  ON "conversation_attendance_holidays"("policy_id", "starts_on");

CREATE TABLE IF NOT EXISTS "conversation_attendance_leave_requests" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "policy_id" UUID,
  "userId" UUID NOT NULL,
  "reviewed_by_user_id" UUID,
  "leave_type" "ConversationAttendanceLeaveType" NOT NULL DEFAULT 'PERSONAL',
  "status" "ConversationAttendanceLeaveStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "reason" TEXT,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "minutes_requested" INTEGER NOT NULL DEFAULT 0,
  "is_partial_day" BOOLEAN NOT NULL DEFAULT false,
  "deduct_from_balance" BOOLEAN NOT NULL DEFAULT true,
  "review_note" TEXT,
  "decided_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversation_attendance_leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "conversation_attendance_leave_requests_conversationId_status_starts_at_idx"
  ON "conversation_attendance_leave_requests"("conversationId", "status", "starts_at");

CREATE INDEX IF NOT EXISTS "conversation_attendance_leave_requests_userId_starts_at_idx"
  ON "conversation_attendance_leave_requests"("userId", "starts_at");

CREATE INDEX IF NOT EXISTS "conversation_attendance_leave_requests_policy_id_starts_at_idx"
  ON "conversation_attendance_leave_requests"("policy_id", "starts_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_attendance_policies_conversationId_fkey'
  ) THEN
    ALTER TABLE "conversation_attendance_policies"
      ADD CONSTRAINT "conversation_attendance_policies_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_attendance_policies_created_by_id_fkey'
  ) THEN
    ALTER TABLE "conversation_attendance_policies"
      ADD CONSTRAINT "conversation_attendance_policies_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_attendance_policies_updated_by_id_fkey'
  ) THEN
    ALTER TABLE "conversation_attendance_policies"
      ADD CONSTRAINT "conversation_attendance_policies_updated_by_id_fkey"
      FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_attendance_holidays_conversationId_fkey'
  ) THEN
    ALTER TABLE "conversation_attendance_holidays"
      ADD CONSTRAINT "conversation_attendance_holidays_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_attendance_holidays_policy_id_fkey'
  ) THEN
    ALTER TABLE "conversation_attendance_holidays"
      ADD CONSTRAINT "conversation_attendance_holidays_policy_id_fkey"
      FOREIGN KEY ("policy_id") REFERENCES "conversation_attendance_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_attendance_holidays_created_by_id_fkey'
  ) THEN
    ALTER TABLE "conversation_attendance_holidays"
      ADD CONSTRAINT "conversation_attendance_holidays_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_attendance_leave_requests_conversationId_fkey'
  ) THEN
    ALTER TABLE "conversation_attendance_leave_requests"
      ADD CONSTRAINT "conversation_attendance_leave_requests_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_attendance_leave_requests_policy_id_fkey'
  ) THEN
    ALTER TABLE "conversation_attendance_leave_requests"
      ADD CONSTRAINT "conversation_attendance_leave_requests_policy_id_fkey"
      FOREIGN KEY ("policy_id") REFERENCES "conversation_attendance_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_attendance_leave_requests_userId_fkey'
  ) THEN
    ALTER TABLE "conversation_attendance_leave_requests"
      ADD CONSTRAINT "conversation_attendance_leave_requests_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_attendance_leave_requests_reviewed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "conversation_attendance_leave_requests"
      ADD CONSTRAINT "conversation_attendance_leave_requests_reviewed_by_user_id_fkey"
      FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
