CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ChatMessage_orgId_createdAt_idx" ON "ChatMessage"("orgId", "createdAt");

INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
SELECT gen_random_uuid(),'placeholder',NOW(),'20260527150000_chat_messages',NULL,NULL,NOW(),1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name"='20260527150000_chat_messages');
