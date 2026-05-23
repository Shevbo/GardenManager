import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'

describe('non-signer removal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes signatures of users who did not sign final petition', async () => {
    vi.mocked(prisma.petitionSignature.deleteMany).mockResolvedValue({ count: 3 })

    const result = await prisma.petitionSignature.deleteMany({
      where: { petitionId: 'p1', signedAt: { lt: new Date('2024-01-01') } },
    })

    expect(result.count).toBe(3)
    expect(prisma.petitionSignature.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ petitionId: 'p1' }) })
    )
  })
})
