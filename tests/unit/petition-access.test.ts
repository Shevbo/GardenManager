import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'
import { canInteractWithPetition } from '@/lib/petition-access'

describe('canInteractWithPetition', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns false if petition not found', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue(null)
    expect(await canInteractWithPetition('u1', 'p1')).toBe(false)
  })

  it('default targeting: allows org member', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue(
      { id: 'p1', orgId: 'org1', orgGroupId: null, activityId: null } as any
    )
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1' } as any)
    expect(await canInteractWithPetition('u1', 'p1')).toBe(true)
  })

  it('default targeting: blocks non-member', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue(
      { id: 'p1', orgId: 'org1', orgGroupId: null, activityId: null } as any
    )
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null)
    expect(await canInteractWithPetition('u1', 'p1')).toBe(false)
  })

  it('activity targeting: allows ActivityMembership holder', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue(
      { id: 'p1', orgId: 'org1', orgGroupId: null, activityId: 'act1' } as any
    )
    vi.mocked(prisma.activityMembership.findUnique).mockResolvedValue({ id: 'am1' } as any)
    expect(await canInteractWithPetition('u1', 'p1')).toBe(true)
  })

  it('activity targeting: blocks user without ActivityMembership', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue(
      { id: 'p1', orgId: 'org1', orgGroupId: null, activityId: 'act1' } as any
    )
    vi.mocked(prisma.activityMembership.findUnique).mockResolvedValue(null)
    expect(await canInteractWithPetition('u1', 'p1')).toBe(false)
  })

  it('orgGroup targeting: allows member of any org in group', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue(
      { id: 'p1', orgId: 'org1', orgGroupId: 'grp1', activityId: null } as any
    )
    vi.mocked(prisma.orgGroupMembership.findMany).mockResolvedValue([
      { organizationId: 'org1' }, { organizationId: 'org2' },
    ] as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1' } as any)
    expect(await canInteractWithPetition('u1', 'p1')).toBe(true)
  })

  it('orgGroup targeting: blocks non-member of any group org', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue(
      { id: 'p1', orgId: 'org1', orgGroupId: 'grp1', activityId: null } as any
    )
    vi.mocked(prisma.orgGroupMembership.findMany).mockResolvedValue([
      { organizationId: 'org1' },
    ] as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null)
    expect(await canInteractWithPetition('u1', 'p1')).toBe(false)
  })
})
