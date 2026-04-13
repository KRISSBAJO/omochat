ALTER TABLE "users"
ADD COLUMN "userCode" TEXT;

UPDATE "users"
SET "userCode" = SUBSTRING(MD5("id"::TEXT) FROM 1 FOR 6)
WHERE "userCode" IS NULL;

CREATE UNIQUE INDEX "users_userCode_key" ON "users"("userCode");
