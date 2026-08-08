import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }))
vi.mock('@/lib/permissions', async (orig) => ({
  ...(await orig() as object),
  requirePhoneVerified: vi.fn(async () => null),
}))

const params = { params: Promise.resolve({ proposalId: 'p1' }) }
const req = () => new Request('http://x', { method: 'POST' })

function proposalRow(over: Record<string, unknown> = {}) {
  return { id: 'p1', orgId: 'org1', status: 'PROPOSED', org: { agendaVoteLimit: 5 }, ...over }
}

describe('POST /api/assemblies/proposals/[id]/vote — голос за тему', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1' } as never) // isOwner
    vi.mocked(prisma.assemblyTopicVote.count).mockResolvedValue(0 as never)
  })

  it('не-собственник не голосует (403)', async () => {
    vi.mocked(prisma.assemblyTopicProposal.findUnique).mockResolvedValue(proposalRow() as never)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null)
    const { POST } = await import('@/app/api/assemblies/proposals/[proposalId]/vote/route')
    const r = await POST(req() as never, params)
    expect(r.status).toBe(403)
  })

  it('собственник голосует (создание)', async () => {
    vi.mocked(prisma.assemblyTopicProposal.findUnique).mockResolvedValue(proposalRow() as never)
    vi.mocked(prisma.assemblyTopicVote.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.assemblyTopicVote.create).mockResolvedValue({} as never)
    vi.mocked(prisma.assemblyTopicVote.count).mockResolvedValueOnce(0 as never) // used до
      .mockResolvedValueOnce(3 as never).mockResolvedValueOnce(1 as never) // votes, usedNow
    const { POST } = await import('@/app/api/assemblies/proposals/[proposalId]/vote/route')
    const r = await POST(req() as never, params)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.voted).toBe(true)
    expect(vi.mocked(prisma.assemblyTopicVote.create)).toHaveBeenCalled()
  })

  it('повторный клик = отзыв голоса (без проверки лимита)', async () => {
    vi.mocked(prisma.assemblyTopicProposal.findUnique).mockResolvedValue(proposalRow() as never)
    vi.mocked(prisma.assemblyTopicVote.findUnique).mockResolvedValue({ id: 'v1' } as never)
    vi.mocked(prisma.assemblyTopicVote.delete).mockResolvedValue({} as never)
    const { POST } = await import('@/app/api/assemblies/proposals/[proposalId]/vote/route')
    const r = await POST(req() as never, params)
    expect(r.status).toBe(200)
    expect((await r.json()).voted).toBe(false)
    expect(vi.mocked(prisma.assemblyTopicVote.delete)).toHaveBeenCalled()
  })

  it('лимит орги исчерпан → 409 с вежливым текстом и цифрой лимита', async () => {
    vi.mocked(prisma.assemblyTopicProposal.findUnique).mockResolvedValue(proposalRow({ org: { agendaVoteLimit: 2 } }) as never)
    vi.mocked(prisma.assemblyTopicVote.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.assemblyTopicVote.count).mockResolvedValue(2 as never) // used = limit
    const { POST } = await import('@/app/api/assemblies/proposals/[proposalId]/vote/route')
    const r = await POST(req() as never, params)
    expect(r.status).toBe(409)
    const d = await r.json()
    expect(d.error).toContain('не более 2')
    expect(vi.mocked(prisma.assemblyTopicVote.create)).not.toHaveBeenCalled()
  })

  it('за включённую/отклонённую тему голосовать нельзя (409)', async () => {
    vi.mocked(prisma.assemblyTopicProposal.findUnique).mockResolvedValue(proposalRow({ status: 'INCLUDED' }) as never)
    vi.mocked(prisma.assemblyTopicVote.findUnique).mockResolvedValue(null)
    const { POST } = await import('@/app/api/assemblies/proposals/[proposalId]/vote/route')
    const r = await POST(req() as never, params)
    expect(r.status).toBe(409)
  })
})
