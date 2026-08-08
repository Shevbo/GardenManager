import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/permissions', async (orig) => ({
  ...(await orig() as object),
  requirePhoneVerified: vi.fn(async () => null),
}))

const FUTURE = new Date(Date.now() + 86400000)
const PAST = new Date(Date.now() - 86400000)

function assemblyRow(over: Record<string, unknown> = {}) {
  return {
    id: 'a1', orgId: 'org1', status: 'VOTING',
    startsAt: PAST, endsAt: FUTURE,
    questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
    ...over,
  }
}

function req(body: unknown) {
  return new Request('http://localhost/api/assemblies/a1/vote', {
    method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  })
}
const params = { params: Promise.resolve({ id: 'a1' }) }

describe('POST /api/assemblies/[id]/vote — частичный бюллетень', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.membership.findMany).mockResolvedValue([{ isOwner: true, areaSqm: 50 }] as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)
  })

  it('пустой бюллетень отклоняется с вежливым текстом', async () => {
    vi.mocked(prisma.assembly.findUnique).mockResolvedValue(assemblyRow() as never)
    const { POST } = await import('@/app/api/assemblies/[id]/vote/route')
    const r = await POST(req({ votes: [] }) as never, params)
    expect(r.status).toBe(400)
    const d = await r.json()
    expect(d.error).toContain('Бюллетень пуст')
  })

  it('частичный бюллетень: неотвеченные вопросы дозаписываются ABSTAIN c auto=true', async () => {
    vi.mocked(prisma.assembly.findUnique).mockResolvedValue(assemblyRow() as never)
    const { POST } = await import('@/app/api/assemblies/[id]/vote/route')
    const r = await POST(req({ votes: [{ questionId: 'q1', choice: 'FOR' }] }) as never, params)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.autoAbstained).toBe(2)
    // в транзакцию ушло 3 upsert-а: 1 явный + 2 авто
    const tx = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown as unknown[]
    expect(tx).toHaveLength(3)
    // и явный голос помечен auto=false
    const upserts = vi.mocked(prisma.assemblyVote.upsert).mock.calls.map(c => c[0] as { create: { questionId: string; choice: string; auto: boolean } })
    const explicit = upserts.find(u => u.create.questionId === 'q1')!
    expect(explicit.create.choice).toBe('FOR')
    expect(explicit.create.auto).toBe(false)
    const autos = upserts.filter(u => u.create.auto)
    expect(autos.map(u => u.create.questionId).sort()).toEqual(['q2', 'q3'])
    expect(autos.every(u => u.create.choice === 'ABSTAIN')).toBe(true)
  })

  it('полный бюллетень — без авто-воздержаний', async () => {
    vi.mocked(prisma.assembly.findUnique).mockResolvedValue(assemblyRow() as never)
    const { POST } = await import('@/app/api/assemblies/[id]/vote/route')
    const r = await POST(req({ votes: [
      { questionId: 'q1', choice: 'FOR' }, { questionId: 'q2', choice: 'AGAINST' }, { questionId: 'q3', choice: 'ABSTAIN' },
    ] }) as never, params)
    expect(r.status).toBe(200)
    expect((await r.json()).autoAbstained).toBe(0)
  })

  it('после endsAt бюллетень отклоняется с вежливым текстом', async () => {
    vi.mocked(prisma.assembly.findUnique).mockResolvedValue(assemblyRow({ endsAt: PAST }) as never)
    const { POST } = await import('@/app/api/assemblies/[id]/vote/route')
    const r = await POST(req({ votes: [{ questionId: 'q1', choice: 'FOR' }] }) as never, params)
    expect(r.status).toBe(400)
    expect((await r.json()).error).toContain('Голосование завершилось')
  })
})
