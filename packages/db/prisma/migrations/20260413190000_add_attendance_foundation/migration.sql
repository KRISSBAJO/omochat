-- CreateEnum
CREATE TYPE "ConversationAttendanceShiftStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConversationAttendanceAssignmentStatus" AS ENUM ('ASSIGNED', 'CONFIRMED', 'DECLINED', 'CALLED_OFF');

-- CreateEnum
CREATE TYPE "ConversationAttendanceClockEventType" AS ENUM ('CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ConversationAttendanceClockMethod" AS ENUM ('WEB', 'MOBILE', 'QR', 'NFC', 'PHOTO', 'MANUAL', 'KIOSK');

-- CreateEnum
CREATE TYPE "ConversationAttendanceRecordStatus" AS ENUM ('ON_CLOCK', 'ON_BREAK', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ABSENT');

-- CreateEnum
CREATE TYPE "ConversationAttendanceExceptionFlag" AS ENUM ('LATE', 'EARLY_LEAVE', 'OVERTIME', 'MISSED_CLOCK_OUT', 'LOCATION_EXCEPTION', 'MANUAL_REVIEW');

-- AlterEnum
ALTER TYPE "ConversationToolPack" ADD VALUE 'ATTENDANCE';

-- CreateTable
CREATE TABLE "conversation_attendance_shift_templates" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location_name" TEXT,
    "location_address" TEXT,
    "starts_at_time" TEXT NOT NULL,
    "ends_at_time" TEXT NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 10,
    "days_of_week" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "requires_location" BOOLEAN NOT NULL DEFAULT false,
    "requires_photo" BOOLEAN NOT NULL DEFAULT false,
    "requires_qr" BOOLEAN NOT NULL DEFAULT false,
    "requires_nfc" BOOLEAN NOT NULL DEFAULT false,
    "geofence_latitude" DOUBLE PRECISION,
    "geofence_longitude" DOUBLE PRECISION,
    "geofence_radius_m" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_attendance_shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_attendance_shifts" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "template_id" UUID,
    "created_by_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "location_name" TEXT,
    "location_address" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 10,
    "approval_required" BOOLEAN NOT NULL DEFAULT true,
    "status" "ConversationAttendanceShiftStatus" NOT NULL DEFAULT 'PUBLISHED',
    "requires_location" BOOLEAN NOT NULL DEFAULT false,
    "requires_photo" BOOLEAN NOT NULL DEFAULT false,
    "requires_qr" BOOLEAN NOT NULL DEFAULT false,
    "requires_nfc" BOOLEAN NOT NULL DEFAULT false,
    "geofence_latitude" DOUBLE PRECISION,
    "geofence_longitude" DOUBLE PRECISION,
    "geofence_radius_m" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_attendance_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_attendance_assignments" (
    "id" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "status" "ConversationAttendanceAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_attendance_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_attendance_records" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "assignment_id" UUID,
    "userId" UUID NOT NULL,
    "reviewed_by_user_id" UUID,
    "status" "ConversationAttendanceRecordStatus" NOT NULL DEFAULT 'ON_CLOCK',
    "flags" "ConversationAttendanceExceptionFlag"[] DEFAULT ARRAY[]::"ConversationAttendanceExceptionFlag"[],
    "clock_in_at" TIMESTAMP(3),
    "clock_out_at" TIMESTAMP(3),
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "worked_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "review_note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "conversation_attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_attendance_clock_events" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "event_type" "ConversationAttendanceClockEventType" NOT NULL,
    "method" "ConversationAttendanceClockMethod" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy_meters" DOUBLE PRECISION,
    "proof_url" TEXT,
    "proof_provider" "MediaProvider",
    "qr_value" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_attendance_clock_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_attendance_shift_templates_conversationId_crea_idx" ON "conversation_attendance_shift_templates"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_attendance_shift_templates_conversationId_is_a_idx" ON "conversation_attendance_shift_templates"("conversationId", "is_active");

-- CreateIndex
CREATE INDEX "conversation_attendance_shifts_conversationId_starts_at_idx" ON "conversation_attendance_shifts"("conversationId", "starts_at");

-- CreateIndex
CREATE INDEX "conversation_attendance_shifts_conversationId_status_starts_idx" ON "conversation_attendance_shifts"("conversationId", "status", "starts_at");

-- CreateIndex
CREATE INDEX "conversation_attendance_shifts_template_id_idx" ON "conversation_attendance_shifts"("template_id");

-- CreateIndex
CREATE INDEX "conversation_attendance_assignments_userId_createdAt_idx" ON "conversation_attendance_assignments"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_attendance_assignments_shiftId_userId_key" ON "conversation_attendance_assignments"("shiftId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_attendance_records_assignment_id_key" ON "conversation_attendance_records"("assignment_id");

-- CreateIndex
CREATE INDEX "conversation_attendance_records_conversationId_status_updat_idx" ON "conversation_attendance_records"("conversationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "conversation_attendance_records_shiftId_status_idx" ON "conversation_attendance_records"("shiftId", "status");

-- CreateIndex
CREATE INDEX "conversation_attendance_records_userId_status_idx" ON "conversation_attendance_records"("userId", "status");

-- CreateIndex
CREATE INDEX "conversation_attendance_clock_events_record_id_occurred_at_idx" ON "conversation_attendance_clock_events"("record_id", "occurred_at");

-- CreateIndex
CREATE INDEX "conversation_attendance_clock_events_actor_user_id_createdA_idx" ON "conversation_attendance_clock_events"("actor_user_id", "createdAt");

-- AddForeignKey
ALTER TABLE "conversation_attendance_shift_templates" ADD CONSTRAINT "conversation_attendance_shift_templates_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_shift_templates" ADD CONSTRAINT "conversation_attendance_shift_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_shifts" ADD CONSTRAINT "conversation_attendance_shifts_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_shifts" ADD CONSTRAINT "conversation_attendance_shifts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "conversation_attendance_shift_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_shifts" ADD CONSTRAINT "conversation_attendance_shifts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_assignments" ADD CONSTRAINT "conversation_attendance_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "conversation_attendance_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_assignments" ADD CONSTRAINT "conversation_attendance_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_assignments" ADD CONSTRAINT "conversation_attendance_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_records" ADD CONSTRAINT "conversation_attendance_records_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_records" ADD CONSTRAINT "conversation_attendance_records_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "conversation_attendance_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_records" ADD CONSTRAINT "conversation_attendance_records_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "conversation_attendance_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_records" ADD CONSTRAINT "conversation_attendance_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_records" ADD CONSTRAINT "conversation_attendance_records_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_clock_events" ADD CONSTRAINT "conversation_attendance_clock_events_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "conversation_attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_attendance_clock_events" ADD CONSTRAINT "conversation_attendance_clock_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "conversation_prayer_requests_conversation_id_visibility_update_" RENAME TO "conversation_prayer_requests_conversationId_visibility_upda_idx";
