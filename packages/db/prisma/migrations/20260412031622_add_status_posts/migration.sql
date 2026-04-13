-- CreateEnum
CREATE TYPE "UserStatusPostType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "user_status_posts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "removedByUserId" UUID,
    "type" "UserStatusPostType" NOT NULL,
    "text" TEXT,
    "caption" TEXT,
    "backgroundColor" TEXT,
    "textColor" TEXT,
    "mediaProvider" "MediaProvider",
    "mediaBucket" TEXT,
    "mediaStorageKey" TEXT,
    "mediaUrl" TEXT,
    "mediaMimeType" TEXT,
    "mediaSizeBytes" INTEGER,
    "mediaWidth" INTEGER,
    "mediaHeight" INTEGER,
    "mediaDurationMs" INTEGER,
    "mediaChecksum" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "removedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_status_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_status_views" (
    "id" UUID NOT NULL,
    "statusPostId" UUID NOT NULL,
    "viewerUserId" UUID NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_status_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_status_reactions" (
    "id" UUID NOT NULL,
    "statusPostId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_status_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_status_comments" (
    "id" UUID NOT NULL,
    "statusPostId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "conversationId" UUID,
    "messageId" UUID,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_status_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_status_posts_userId_createdAt_idx" ON "user_status_posts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_status_posts_userId_expiresAt_idx" ON "user_status_posts"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "user_status_posts_expiresAt_removedAt_idx" ON "user_status_posts"("expiresAt", "removedAt");

-- CreateIndex
CREATE INDEX "user_status_posts_removedByUserId_idx" ON "user_status_posts"("removedByUserId");

-- CreateIndex
CREATE INDEX "user_status_views_viewerUserId_viewedAt_idx" ON "user_status_views"("viewerUserId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_status_views_statusPostId_viewerUserId_key" ON "user_status_views"("statusPostId", "viewerUserId");

-- CreateIndex
CREATE INDEX "user_status_reactions_userId_createdAt_idx" ON "user_status_reactions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_status_reactions_statusPostId_userId_key" ON "user_status_reactions"("statusPostId", "userId");

-- CreateIndex
CREATE INDEX "user_status_comments_statusPostId_createdAt_idx" ON "user_status_comments"("statusPostId", "createdAt");

-- CreateIndex
CREATE INDEX "user_status_comments_userId_createdAt_idx" ON "user_status_comments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_status_comments_conversationId_idx" ON "user_status_comments"("conversationId");

-- CreateIndex
CREATE INDEX "user_status_comments_messageId_idx" ON "user_status_comments"("messageId");

-- AddForeignKey
ALTER TABLE "user_status_posts" ADD CONSTRAINT "user_status_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_status_posts" ADD CONSTRAINT "user_status_posts_removedByUserId_fkey" FOREIGN KEY ("removedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_status_views" ADD CONSTRAINT "user_status_views_statusPostId_fkey" FOREIGN KEY ("statusPostId") REFERENCES "user_status_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_status_views" ADD CONSTRAINT "user_status_views_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_status_reactions" ADD CONSTRAINT "user_status_reactions_statusPostId_fkey" FOREIGN KEY ("statusPostId") REFERENCES "user_status_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_status_reactions" ADD CONSTRAINT "user_status_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_status_comments" ADD CONSTRAINT "user_status_comments_statusPostId_fkey" FOREIGN KEY ("statusPostId") REFERENCES "user_status_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_status_comments" ADD CONSTRAINT "user_status_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_status_comments" ADD CONSTRAINT "user_status_comments_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_status_comments" ADD CONSTRAINT "user_status_comments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
