import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/permissions'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ isPlatformAdmin: vi.fn() }))

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

describe('PATCH document-template', () => {
  beforeEach(() => vi.clearAllMocks())
  it('403 for non-admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u' } } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(false)
    const { PATCH } = await import('@/app/api/admin/platform/document-templates/[id]/route')
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ title: 'New' }) })
    const res = await PATCH(req as any, ctx('t1') as any)
    expect(res.status).toBe(403)
  })
  it('updates allowed fields for admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'a' } } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(true)
    vi.mocked(prisma.documentTemplate.update).mockResolvedValue({ id: 't1', title: 'New' } as any)
    const { PATCH } = await import('@/app/api/admin/platform/document-templates/[id]/route')
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ title: 'New', bogus: 'x' }) })
    const res = await PATCH(req as any, ctx('t1') as any)
    expect(res.status).toBe(200)
    const callArg = vi.mocked(prisma.documentTemplate.update).mock.calls[0][0]
    expect(callArg.data).toHaveProperty('title', 'New')
    expect(callArg.data).not.toHaveProperty('bogus')
  })
})

describe('DELETE document-template', () => {
  beforeEach(() => vi.clearAllMocks())
  it('409 when template is used by generated documents', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'a' } } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(true)
    vi.mocked(prisma.generatedDocument.count).mockResolvedValue(2 as any)
    const { DELETE } = await import('@/app/api/admin/platform/document-templates/[id]/route')
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }) as any, ctx('t1') as any)
    expect(res.status).toBe(409)
  })
  it('deletes when unused', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'a' } } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(true)
    vi.mocked(prisma.generatedDocument.count).mockResolvedValue(0 as any)
    vi.mocked(prisma.documentTemplate.delete).mockResolvedValue({ id: 't1' } as any)
    const { DELETE } = await import('@/app/api/admin/platform/document-templates/[id]/route')
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }) as any, ctx('t1') as any)
    expect(res.status).toBe(200)
  })
})
