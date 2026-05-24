-- CreateTable
CREATE TABLE "InviteLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "apartmentId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteLink_token_key" ON "InviteLink"("token");

-- CreateIndex
CREATE INDEX "InviteLink_orgId_idx" ON "InviteLink"("orgId");

-- CreateIndex
CREATE INDEX "InviteLink_token_idx" ON "InviteLink"("token");

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
