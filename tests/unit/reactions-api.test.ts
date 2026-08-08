import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/permissions', async (orig) => ({
  ...(await orig() as object),
  requirePhoneVerified: vi.fn(async () => null),
}))

const params = { params: Promise.resolve({ id: 'pet1' }) }
const req = (emoji: string) => new Request('http://x', {
  method: 'POST', body: JSON.stringify({ emoji }), headers: { 'Content-Type': 'application/json' },
})

describe('реакции: одна на пользователя', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({ id: 'pet1' } as never)
  })

  it('новый смайл ЗАМЕНЯЕТ прежнюю реакцию (deleteMany + create)', async () => {
    vi.mocked(prisma.petitionReaction.findMany).mockResolvedValue([{ id: 'r1', emoji: '👍' }] as never)
    const { POST } = await import('@/app/api/petitions/[id]/reactions/route')
    const r = await POST(req('🔥') as never, params)
    expect(r.status).toBe(201)
    expect(vi.mocked(prisma.petitionReaction.deleteMany)).toHaveBeenCalledWith({ where: { petitionId: 'pet1', userId: 'u1' } })
    expect(vi.mocked(prisma.petitionReaction.create)).toHaveBeenCalledOnce()
  })

  it('клик по своему смайлу снимает реакцию, новая не создаётся', async () => {
    vi.mocked(prisma.petitionReaction.findMany).mockResolvedValue([{ id: 'r1', emoji: '👍' }] as never)
    const { POST } = await import('@/app/api/petitions/[id]/reactions/route')
    const r = await POST(req('👍') as never, params)
    expect(r.status).toBe(200)
    expect((await r.json()).added).toBe(false)
    expect(vi.mocked(prisma.petitionReaction.create)).not.toHaveBeenCalled()
  })

  it('старая «стопка» из нескольких реакций схлопывается одним кликом', async () => {
    vi.mocked(prisma.petitionReaction.findMany).mockResolvedValue([
      { id: 'r1', emoji: '👍' }, { id: 'r2', emoji: '❤️' }, { id: 'r3', emoji: '🔥' },
    ] as never)
    const { POST } = await import('@/app/api/petitions/[id]/reactions/route')
    const r = await POST(req('🙏') as never, params)
    expect(r.status).toBe(201)
    // deleteMany снёс ВСЕ прежние, создан ровно один
    expect(vi.mocked(prisma.petitionReaction.deleteMany)).toHaveBeenCalledOnce()
    expect(vi.mocked(prisma.petitionReaction.create)).toHaveBeenCalledOnce()
  })
})
