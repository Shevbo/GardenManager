-- Owners may hold several objects in one org: relax the per-(user,org) unique
-- to per-(user,org,apartment). Permissive change — existing rows stay valid.
DROP INDEX IF EXISTS "Membership_userId_orgId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_userId_orgId_apartmentId_key" ON "Membership"("userId", "orgId", "apartmentId");
CREATE INDEX IF NOT EXISTS "Membership_userId_orgId_idx" ON "Membership"("userId", "orgId");
