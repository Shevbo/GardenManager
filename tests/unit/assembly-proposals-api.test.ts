import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'

const authMock = vi.fn(async () => ({ user: { id: 'u1' } }))
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/active-org', () => ({ getActiveOrgId: vi.fn(async () => 'org1') }))
vi.mock('@/lib/notify', () => ({ notifyAgenda: vi.fn(async () => {}) }))

const canManage = vi.fn(async () => false)
vi.mock('@/lib/permissions', async (orig) => ({
  ...(await orig() as object),
  requirePhoneVerified: vi.fn(async () => null),
  canManageOrgWorkflow: () => canManage(),
}))

describe('вёрстка повестки — API предложений', () => {
  beforeEach(() => vi.clearAllMocks())

  it('не-собственник не может предложить тему', async () => {
    canManage.mockResolvedValue(false)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null) // не owner
    const { POST } = await import('@/app/api/assemblies/proposals/route')
    const r = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ title: 'Тема' }) }) as never)
    expect(r.status).toBe(403)
    expect((await r.json()).error).toContain('собственники')
  })

  it('собственник создаёт предложение (PROPOSED)', async () => {
    canManage.mockResolvedValue(false)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1' } as never)
    vi.mocked(prisma.assemblyTopicProposal.create).mockResolvedValue({ id: 'p1', title: 'Тема', status: 'PROPOSED' } as never)
    vi.mocked(prisma.orgRoleAssignment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: 'Иван' } as never)
    const { POST } = await import('@/app/api/assemblies/proposals/route')
    const r = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ title: 'Тема' }) }) as never)
    expect(r.status).toBe(201)
  })

  it('решение по предложению — только управляющим (текст из permissions)', async () => {
    canManage.mockResolvedValue(false)
    vi.mocked(prisma.assemblyTopicProposal.findUnique).mockResolvedValue(
      { id: 'p1', orgId: 'org1', title: 'Тема', status: 'PROPOSED', createdBy: 'u2' } as never)
    const { PATCH } = await import('@/app/api/assemblies/proposals/[proposalId]/route')
    const r = await PATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) }) as never,
      { params: Promise.resolve({ proposalId: 'p1' }) },
    )
    expect(r.status).toBe(403)
    expect((await r.json()).error).toContain('Доступ к этой функции')
  })

  it('председатель принимает; автору уходит уведомление', async () => {
    canManage.mockResolvedValue(true)
    vi.mocked(prisma.assemblyTopicProposal.findUnique).mockResolvedValue(
      { id: 'p1', orgId: 'org1', title: 'Тема', status: 'PROPOSED', createdBy: 'u2' } as never)
    vi.mocked(prisma.assemblyTopicProposal.update).mockResolvedValue({ id: 'p1', status: 'ACCEPTED' } as never)
    const { PATCH } = await import('@/app/api/assemblies/proposals/[proposalId]/route')
    const { notifyAgenda } = await import('@/lib/notify')
    const r = await PATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) }) as never,
      { params: Promise.resolve({ proposalId: 'p1' }) },
    )
    expect(r.status).toBe(200)
    expect(vi.mocked(notifyAgenda)).toHaveBeenCalledWith('u2', expect.stringContaining('принята'), undefined)
  })

  it('включённую в повестку тему нельзя перерешать (409)', async () => {
    canManage.mockResolvedValue(true)
    vi.mocked(prisma.assemblyTopicProposal.findUnique).mockResolvedValue(
      { id: 'p1', orgId: 'org1', title: 'Тема', status: 'INCLUDED', createdBy: 'u2' } as never)
    const { PATCH } = await import('@/app/api/assemblies/proposals/[proposalId]/route')
    const r = await PATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ action: 'reject' }) }) as never,
      { params: Promise.resolve({ proposalId: 'p1' }) },
    )
    expect(r.status).toBe(409)
  })
})
