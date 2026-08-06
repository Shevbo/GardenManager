import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'
import { requirePhoneVerified, getUserActionBlockers, isPlatformAdmin, canManageOrgWorkflow } from './permissions'

describe('requirePhoneVerified', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when phone is verified', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1', phoneVerified: new Date(), status: 'ACTIVE',
    } as any)
    const r = await requirePhoneVerified('u1')
    expect(r).toBeNull()
  })

  it('returns 403 response when phone not verified', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1', phoneVerified: null, status: 'ACTIVE',
    } as any)
    const r = await requirePhoneVerified('u1')
    expect(r).not.toBeNull()
    expect(r!.status).toBe(403)
    const body = await r!.json()
    expect(body.error).toBe('PhoneVerificationRequired')
  })

  it('returns 403 with PendingApproval when status is PENDING', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1', phoneVerified: new Date(), status: 'PENDING',
    } as any)
    const r = await requirePhoneVerified('u1')
    expect(r).not.toBeNull()
    expect(r!.status).toBe(403)
    const body = await r!.json()
    expect(body.error).toBe('PendingApproval')
  })

  it('returns 401 when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const r = await requirePhoneVerified('missing')
    expect(r).not.toBeNull()
    expect(r!.status).toBe(401)
  })
})

describe('canManageOrgWorkflow', () => {
  beforeEach(() => vi.clearAllMocks())

  const notPlatformAdmin = () =>
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'owner@example.com' } as any)

  it('allows the platform owner even with an owner-only membership', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'bshevelev@mail.ru' } as any)
    expect(await canManageOrgWorkflow('u1', 'org1')).toBe(true)
  })

  it('gmail-аккаунт больше НЕ платформенный админ', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'bshevelev75@gmail.com' } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.orgRoleAssignment.findFirst).mockResolvedValue(null)
    expect(await isPlatformAdmin('u1')).toBe(false)
    expect(await canManageOrgWorkflow('u1', 'org1')).toBe(false)
  })

  it('allows the org_admin governance position (Membership.role stays "owner")', async () => {
    notPlatformAdmin()
    // isPlatformAdmin's membership probe, then isOrgAdmin's admin-role probe
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.orgRoleAssignment.findFirst).mockResolvedValue({ id: 'gov1' } as any)
    expect(await canManageOrgWorkflow('u1', 'org1')).toBe(true)
  })

  it('совет дома (council_member) — БЕЗ доступа к рабочим действиям', async () => {
    notPlatformAdmin()
    vi.mocked(prisma.membership.findFirst)
      .mockResolvedValueOnce(null)                        // platform_admin probe
      .mockResolvedValueOnce(null)                        // isOrgAdmin admin-role probe
      .mockResolvedValueOnce(null)                        // manager-roles probe (council не входит)
    vi.mocked(prisma.orgRoleAssignment.findFirst).mockResolvedValue(null)
    expect(await canManageOrgWorkflow('u1', 'org1')).toBe(false)
  })

  it('allows the chairman', async () => {
    notPlatformAdmin()
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.orgRoleAssignment.findFirst)
      .mockResolvedValueOnce(null)                        // isOrgAdmin gov probe (org_admin)
      .mockResolvedValueOnce({ id: 'gov2' } as any)       // board probe (chairman)
    expect(await canManageOrgWorkflow('u1', 'org1')).toBe(true)
  })

  it('denies a plain owner with no positions', async () => {
    notPlatformAdmin()
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.orgRoleAssignment.findFirst).mockResolvedValue(null)
    expect(await canManageOrgWorkflow('u1', 'org1')).toBe(false)
  })
})

describe('getUserActionBlockers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array for fully verified active user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      phoneVerified: new Date(), status: 'ACTIVE',
    } as any)
    expect(await getUserActionBlockers('u1')).toEqual([])
  })

  it('returns ["phone"] when phone unverified', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      phoneVerified: null, status: 'ACTIVE',
    } as any)
    expect(await getUserActionBlockers('u1')).toEqual(['phone'])
  })

  it('returns ["pending"] when status PENDING', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      phoneVerified: new Date(), status: 'PENDING',
    } as any)
    expect(await getUserActionBlockers('u1')).toEqual(['pending'])
  })

  it('returns ["pending","phone"] when both', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      phoneVerified: null, status: 'PENDING',
    } as any)
    expect(await getUserActionBlockers('u1')).toEqual(['pending', 'phone'])
  })
})
