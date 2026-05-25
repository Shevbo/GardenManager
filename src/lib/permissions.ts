import prisma from '@/lib/prisma'

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const m = await prisma.membership.findFirst({
    where: { userId, role: 'platform_admin' },
  })
  return !!m
}
