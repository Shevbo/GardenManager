import type { PrismaClient } from '@prisma/client'

export const LAWYER_QUOTA_KEY = 'lawyer_quota_per_document'

export async function getSetting(
  prisma: PrismaClient,
  key: string,
  fallback: string
): Promise<string> {
  const row = await prisma.platformSetting.findUnique({ where: { key } })
  return row?.value ?? fallback
}

export async function getLawyerQuota(prisma: PrismaClient): Promise<number> {
  const n = parseInt(await getSetting(prisma, LAWYER_QUOTA_KEY, '5'), 10)
  // Allow 0 (means non-admins cannot ask). Fall back to 5 only when not a valid non-negative number.
  return Number.isFinite(n) && n >= 0 ? n : 5
}
