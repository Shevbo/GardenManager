-- ПЭП-подпись собрания через СМС (mirror of PetitionSignature). Additive: new table only.
CREATE TABLE "AssemblySignature" (
  "id" TEXT NOT NULL,
  "assemblyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "verifiedVia" TEXT NOT NULL,
  "legalConsent" BOOLEAN NOT NULL DEFAULT false,
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssemblySignature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssemblySignature_assemblyId_userId_key" ON "AssemblySignature"("assemblyId", "userId");
CREATE INDEX "AssemblySignature_assemblyId_idx" ON "AssemblySignature"("assemblyId");

ALTER TABLE "AssemblySignature" ADD CONSTRAINT "AssemblySignature_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssemblySignature" ADD CONSTRAINT "AssemblySignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
