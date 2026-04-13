CREATE TYPE "PlatformRole" AS ENUM ('SITE_ADMIN', 'PLATFORM_ADMIN', 'MODERATOR');

CREATE TABLE "user_platform_roles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "assignedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_platform_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_platform_roles_userId_role_key" ON "user_platform_roles"("userId", "role");
CREATE INDEX "user_platform_roles_role_idx" ON "user_platform_roles"("role");
CREATE INDEX "user_platform_roles_assignedByUserId_idx" ON "user_platform_roles"("assignedByUserId");

ALTER TABLE "user_platform_roles"
ADD CONSTRAINT "user_platform_roles_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_platform_roles"
ADD CONSTRAINT "user_platform_roles_assignedByUserId_fkey"
FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
