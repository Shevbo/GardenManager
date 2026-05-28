import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'
import { requirePhoneVerified, getUserActionBlockers, isPlatformAdmin } from './permissions'

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
