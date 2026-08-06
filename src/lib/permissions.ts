import { NextResponse } from 'next/server'
import type { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

// Platform owner accounts — ALWAYS platform-admin, independent of any org
// membership (Boris must reach «Управление» regardless of group inclusion).
// Additional admins can still be granted via a platform_admin membership role.
const PLATFORM_ADMIN_EMAILS = new Set(['bshevelev75@gmail.com', 'bshevelev@mail.ru'])

/** Normalized full-name key (case/ё-insensitive, word-order-insensitive) so the
 *  same person holding several accounts collapses to one entry. */
function nameKey(name: string | null): string {
  return (name ?? '').toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(Boolean).sort().join(' ')
}

/** Platform admins for display (email-based owners + platform_admin memberships),
 *  deduped by identity AND by normalized name (one human = one row). */
export async function getPlatformAdminUsers(): Promise<Array<{ id: string; name: string | null }>> {
  const byEmail = await prisma.user.findMany({
    where: { email: { in: [...PLATFORM_ADMIN_EMAILS] } },
    select: { id: true, name: true },
  })
  const byRole = await prisma.user.findMany({
    where: { memberships: { some: { role: 'platform_admin' } } },
    select: { id: true, name: true },
  })
  const byId = new Map<string, { id: string; name: string | null }>()
  for (const u of [...byEmail, ...byRole]) byId.set(u.id, u)

  const seenName = new Set<string>()
  const out: Array<{ id: string; name: string | null }> = []
  for (const u of byId.values()) {
    const k = nameKey(u.name)
    if (k && seenName.has(k)) continue
    if (k) seenName.add(k)
    out.push(u)
  }
  return out
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (user?.email && PLATFORM_ADMIN_EMAILS.has(user.email.toLowerCase())) return true
  const m = await prisma.membership.findFirst({
    where: { userId, role: 'platform_admin' },
  })
  return !!m
}

/**
 * Admin for a specific org: platform-admin, an admin-level Membership.role, or
 * the `org_admin` governance position. Used to gate org-scoped management.
 */
export async function isOrgAdmin(userId: string, orgId: string): Promise<boolean> {
  if (await isPlatformAdmin(userId)) return true
  const m = await prisma.membership.findFirst({
    where: { userId, orgId, role: { in: ['org_admin', 'coalition_admin', 'platform_admin'] } },
    select: { id: true },
  })
  if (m) return true
  const gov = await prisma.orgRoleAssignment.findFirst({
    where: { userId, orgId, role: 'org_admin' }, select: { id: true },
  })
  return !!gov
}

/** Membership roles that have always implied org management. */
const ORG_MANAGER_MEMBERSHIP_ROLES: Role[] = ['org_admin', 'council_member', 'coalition_admin', 'platform_admin']

/**
 * May convene an ОСС in this org (create/see the «Создать собрание» action).
 *
 * `Membership.role` alone is NOT enough: a person can be a plain `owner` there
 * and still be the platform admin or hold a governance position (chairman /
 * deputy / secretary / org_admin) — those positions live in `OrgRoleAssignment`,
 * separately from ownership. Gating on the membership role only made the button
 * invisible to the very people who convene meetings.
 */
export async function canManageAssemblies(userId: string, orgId: string): Promise<boolean> {
  if (await isOrgAdmin(userId, orgId)) return true
  const m = await prisma.membership.findFirst({
    where: { userId, orgId, role: { in: ORG_MANAGER_MEMBERSHIP_ROLES } },
    select: { id: true },
  })
  if (m) return true
  const gov = await prisma.orgRoleAssignment.findFirst({
    where: { userId, orgId, role: { in: ['chairman', 'vice_chairman', 'secretary'] } },
    select: { id: true },
  })
  return !!gov
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
