-- CreateTable
CREATE TABLE "PropertyOwnership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "addressNormalized" TEXT,
    "apartmentNumber" TEXT,
    "areaSqm" DOUBLE PRECISION,
    "sharePercent" DOUBLE PRECISION,
    "orgId" TEXT,
    "orgName" TEXT,
    "buildingId" TEXT,
    "declaredText" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyOwnership_userId_idx" ON "PropertyOwnership"("userId");

-- AddForeignKey
ALTER TABLE "PropertyOwnership" ADD CONSTRAINT "PropertyOwnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
