ALTER TABLE "conversations"
ADD COLUMN "invite_code" TEXT,
ADD COLUMN "invite_code_created_at" TIMESTAMP(3),
ADD COLUMN "invite_code_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "conversations_invite_code_key" ON "conversations"("invite_code");
