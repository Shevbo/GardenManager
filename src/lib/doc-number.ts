import type { PrismaClient } from '@prisma/client'

/** Formats a document number as `2026-001` (year + zero-padded sequence). */
export function formatDocNumber(year: number | null | undefined, seq: number | null | undefined): string | null {
  if (!year || !seq) return null
  return `${year}-${String(seq).padStart(3, '0')}`
}

/**
 * Atomically assigns docYear/docSeq to a petition if not already set.
 * Sequence is continuous per calendar year via the DocumentCounter table.
 */
export async function assignDocNumber(prisma: PrismaClient, petitionId: string): Promise<{ year: number; seq: number } | null> {
  const year = new Date().getFullYear()
  return prisma.$transaction(async (tx) => {
    const existing = await tx.petition.findUnique({ where: { id: petitionId }, select: { docYear: true, docSeq: true } })
    if (!existing) return null
    if (existing.docYear && existing.docSeq) return { year: existing.docYear, seq: existing.docSeq }
    const counter = await tx.documentCounter.upsert({ where: { year }, create: { year, lastSeq: 1 }, update: { lastSeq: { increment: 1 } } })
    await tx.petition.update({ where: { id: petitionId }, data: { docYear: year, docSeq: counter.lastSeq } })
    return { year, seq: counter.lastSeq }
  })
}
