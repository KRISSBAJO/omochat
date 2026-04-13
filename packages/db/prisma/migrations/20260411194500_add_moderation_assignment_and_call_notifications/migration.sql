ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MESSAGE_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CALL_RINGING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CALL_MISSED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REPORT_UPDATED';

ALTER TABLE "user_reports"
  ADD COLUMN "assignedModeratorUserId" UUID,
  ADD COLUMN "reviewedByUserId" UUID,
  ADD COLUMN "moderatorNote" TEXT,
  ADD COLUMN "resolutionNote" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

ALTER TABLE "user_reports"
  ADD CONSTRAINT "user_reports_assignedModeratorUserId_fkey"
    FOREIGN KEY ("assignedModeratorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "user_reports_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "user_reports_assignedModeratorUserId_status_idx"
  ON "user_reports"("assignedModeratorUserId", "status");

CREATE INDEX "user_reports_reviewedByUserId_status_idx"
  ON "user_reports"("reviewedByUserId", "status");
