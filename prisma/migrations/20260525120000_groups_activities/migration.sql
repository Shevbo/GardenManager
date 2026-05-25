CREATE TABLE "OrgGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrgGroupMembership" (
  "orgGroupId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "OrgGroupMembership_pkey" PRIMARY KEY ("orgGroupId","organizationId")
);

CREATE TABLE "Activity" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "orgId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityMembership" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityMembership_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Petition" ADD COLUMN "orgGroupId" TEXT;
ALTER TABLE "Petition" ADD COLUMN "activityId" TEXT;

ALTER TABLE "OrgGroup" ADD CONSTRAINT "OrgGroup_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrgGroupMembership" ADD CONSTRAINT "OrgGroupMembership_orgGroupId_fkey"
  FOREIGN KEY ("orgGroupId") REFERENCES "OrgGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgGroupMembership" ADD CONSTRAINT "OrgGroupMembership_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivityMembership" ADD CONSTRAINT "ActivityMembership_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityMembership" ADD CONSTRAINT "ActivityMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityMembership" ADD CONSTRAINT "ActivityMembership_activityId_userId_key"
  UNIQUE ("activityId","userId");

ALTER TABLE "Petition" ADD CONSTRAINT "Petition_orgGroupId_fkey"
  FOREIGN KEY ("orgGroupId") REFERENCES "OrgGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Petition" ADD CONSTRAINT "Petition_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ActivityMembership_activityId_idx" ON "ActivityMembership"("activityId");
CREATE INDEX "ActivityMembership_userId_idx" ON "ActivityMembership"("userId");
CREATE INDEX "Petition_orgGroupId_idx" ON "Petition"("orgGroupId");
CREATE INDEX "Petition_activityId_idx" ON "Petition"("activityId");

INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
SELECT gen_random_uuid(),'placeholder',NOW(),'20260525120000_groups_activities',NULL,NULL,NOW(),1
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" WHERE "migration_name"='20260525120000_groups_activities'
);
