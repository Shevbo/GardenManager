-- Petition: doc number + AI summary
ALTER TABLE "Petition" ADD COLUMN "docYear" INTEGER;
ALTER TABLE "Petition" ADD COLUMN "docSeq" INTEGER;
ALTER TABLE "Petition" ADD COLUMN "aiSummary" TEXT;

-- DocumentCounter
CREATE TABLE "DocumentCounter" (
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("year")
);

-- PetitionLawyerMessage
CREATE TABLE "PetitionLawyerMessage" (
    "id" TEXT NOT NULL,
    "petitionId" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PetitionLawyerMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PetitionLawyerMessage_petitionId_idx" ON "PetitionLawyerMessage"("petitionId");
ALTER TABLE "PetitionLawyerMessage" ADD CONSTRAINT "PetitionLawyerMessage_petitionId_fkey" FOREIGN KEY ("petitionId") REFERENCES "Petition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PlatformSetting
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);
