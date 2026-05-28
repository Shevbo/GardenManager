import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const m = await prisma.membership.findFirst({
    where: { userId, role: 'platform_admin' },
  })
  return !!m
}

/**
 * Returns null if the user is allowed to perform write actions
 * (status=ACTIVE and phoneVerified is set). Otherwise returns a
 * NextResponse that the caller can return directly.
 */
export async function requirePhoneVerified(userId: string): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneVerified: true, status: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.status === 'PENDING') {
    return NextResponse.json(
      { error: 'PendingApproval', message: 'Заявка ожидает одобрения администратором платформы.' },
      { status: 403 }
    )
  }
  if (!user.phoneVerified) {
    return NextResponse.json(
      { error: 'PhoneVerificationRequired', message: 'Для этого действия требуется подтверждённый номер телефона.' },
      { status: 403 }
    )
  }
  return null
}

/** Returns list of blocker codes ('pending', 'phone') for UI display. */
export async function getUserActionBlockers(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneVerified: true, status: true },
  })
  if (!user) return ['unknown']
  const blockers: string[] = []
  if (user.status === 'PENDING') blockers.push('pending')
  if (!user.phoneVerified) blockers.push('phone')
  return blockers
}
