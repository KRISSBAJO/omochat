CREATE TYPE "AdminActionType" AS ENUM (
  'USER_SUSPENDED',
  'USER_RESTORED',
  'USER_ROLE_UPDATED'
);

CREATE TABLE "user_admin_actions" (
  "id" UUID NOT NULL,
  "targetUserId" UUID NOT NULL,
  "actorUserId" UUID,
  "type" "AdminActionType" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_admin_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_admin_actions_targetUserId_createdAt_idx" ON "user_admin_actions"("targetUserId", "createdAt");
CREATE INDEX "user_admin_actions_actorUserId_createdAt_idx" ON "user_admin_actions"("actorUserId", "createdAt");
CREATE INDEX "user_admin_actions_type_createdAt_idx" ON "user_admin_actions"("type", "createdAt");

ALTER TABLE "user_admin_actions"
ADD CONSTRAINT "user_admin_actions_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_admin_actions"
ADD CONSTRAINT "user_admin_actions_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
