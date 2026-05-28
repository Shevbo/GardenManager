-- UserStatus + PendingStatus enums
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE');
CREATE TYPE "PendingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- User fields
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "shectoryUserId" TEXT;
CREATE UNIQUE INDEX "User_shectoryUserId_key" ON "User"("shectoryUserId");

-- Building decoupling
ALTER TABLE "Building" DROP CONSTRAINT IF EXISTS "Building_orgId_address_key";
ALTER TABLE "Building" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "Building" ADD COLUMN "addressNormalized" TEXT;
ALTER TABLE "Building" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Building" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "Building_addressNormalized_key" ON "Building"("addressNormalized");

-- Membership.verifiedBy
ALTER TABLE "Membership" ADD COLUMN "verifiedBy" TEXT;

-- PendingRegistration
CREATE TABLE "PendingRegistration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestedAddress" TEXT NOT NULL,
  "addressNormalized" TEXT,
  "apartmentNumber" TEXT,
  "areaSqm" DOUBLE PRECISION,
  "isOwner" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "status" "PendingStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingRegistration_userId_key" ON "PendingRegistration"("userId");
CREATE INDEX "PendingRegistration_status_createdAt_idx"
  ON "PendingRegistration"("status", "createdAt");
CREATE INDEX "PendingRegistration_addressNormalized_idx"
  ON "PendingRegistration"("addressNormalized");

ALTER TABLE "PendingRegistration" ADD CONSTRAINT "PendingRegistration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OwnershipDeclaration
CREATE TABLE "OwnershipDeclaration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "areaSqm" DOUBLE PRECISION,
  "sharePercent" DOUBLE PRECISION,
  "declaredText" TEXT NOT NULL,
  "smsToken" TEXT NOT NULL,
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnershipDeclaration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OwnershipDeclaration_userId_idx" ON "OwnershipDeclaration"("userId");
CREATE INDEX "OwnershipDeclaration_membershipId_idx" ON "OwnershipDeclaration"("membershipId");

ALTER TABLE "OwnershipDeclaration" ADD CONSTRAINT "OwnershipDeclaration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnershipDeclaration" ADD CONSTRAINT "OwnershipDeclaration_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Record migration
INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
SELECT gen_random_uuid(),'placeholder',NOW(),'20260528000000_registration_foundation',NULL,NULL,NOW(),1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name"='20260528000000_registration_foundation');
