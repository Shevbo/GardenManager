-- AlterTable
ALTER TABLE "Petition" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PetitionReaction" (
  "id" TEXT NOT NULL,
  "petitionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" VARCHAR(10) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PetitionReaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PetitionReaction_petitionId_userId_emoji_key" UNIQUE ("petitionId", "userId", "emoji")
);

-- CreateTable
CREATE TABLE "CommentReaction" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" VARCHAR(10) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommentReaction_commentId_userId_emoji_key" UNIQUE ("commentId", "userId", "emoji")
);

-- AddForeignKey
ALTER TABLE "PetitionReaction" ADD CONSTRAINT "PetitionReaction_petitionId_fkey"
  FOREIGN KEY ("petitionId") REFERENCES "Petition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PetitionReaction" ADD CONSTRAINT "PetitionReaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "PetitionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PetitionReaction_petitionId_idx" ON "PetitionReaction"("petitionId");
CREATE INDEX "CommentReaction_commentId_idx" ON "CommentReaction"("commentId");
