CREATE TYPE "AssemblyType" AS ENUM ('online', 'async_collect');
CREATE TYPE "AssemblyStatus" AS ENUM ('DRAFT', 'ANNOUNCED', 'VOTING', 'CLOSED');
CREATE TYPE "VoteChoice" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

CREATE TABLE "Assembly" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "AssemblyType" NOT NULL,
  "status" "AssemblyStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "quorumPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "Assembly_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssemblyQuestion" (
  "id" TEXT NOT NULL,
  "assemblyId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "description" TEXT,
  "requiredMajorityPct" DOUBLE PRECISION NOT NULL DEFAULT 50,
  CONSTRAINT "AssemblyQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssemblyVote" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "choice" "VoteChoice" NOT NULL,
  "areaSqm" DOUBLE PRECISION NOT NULL,
  "isOwner" BOOLEAN NOT NULL,
  "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssemblyVote_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssemblyQuestion" ADD CONSTRAINT "AssemblyQuestion_assemblyId_fkey"
  FOREIGN KEY ("assemblyId") REFERENCES "Assembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssemblyVote" ADD CONSTRAINT "AssemblyVote_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "AssemblyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssemblyVote" ADD CONSTRAINT "AssemblyVote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "AssemblyQuestion_assemblyId_order_key" ON "AssemblyQuestion"("assemblyId", "order");
CREATE INDEX "AssemblyQuestion_assemblyId_idx" ON "AssemblyQuestion"("assemblyId");
CREATE UNIQUE INDEX "AssemblyVote_questionId_userId_key" ON "AssemblyVote"("questionId", "userId");
CREATE INDEX "AssemblyVote_questionId_idx" ON "AssemblyVote"("questionId");
CREATE INDEX "Assembly_orgId_status_idx" ON "Assembly"("orgId", "status");
CREATE INDEX "Assembly_orgId_createdAt_idx" ON "Assembly"("orgId", "createdAt");

INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
SELECT gen_random_uuid(),'placeholder',NOW(),'20260527160000_assemblies',NULL,NULL,NOW(),1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name"='20260527160000_assemblies');
