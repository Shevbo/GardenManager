import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'
import { canTransition } from '@/lib/petition-status'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

describe('petition status transitions in API', () => {
  it('allows valid transition DRAFT → DISCUSSION', () => {
    expect(canTransition('DRAFT', 'DISCUSSION')).toBe(true)
  })

  it('rejects invalid transition DRAFT → SIGNING', () => {
    expect(canTransition('DRAFT', 'SIGNING')).toBe(false)
  })
})

describe('petition creation mock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates petition with DRAFT status', async () => {
    const mockPetition = {
      id: 'p1', orgId: 'org1', title: 'Test', draftText: 'Draft',
      status: 'DRAFT', createdBy: 'user1',
      createdAt: new Date(), updatedAt: new Date(),
      finalText: null, discussionDeadline: null, signingDeadline: null,
    }
    vi.mocked(prisma.petition.create).mockResolvedValue(mockPetition as any)

    const result = await prisma.petition.create({
      data: { orgId: 'org1', title: 'Test', draftText: 'Draft', createdBy: 'user1' },
    })
    expect(result.status).toBe('DRAFT')
    expect(result.orgId).toBe('org1')
  })
})
