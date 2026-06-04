import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/permissions'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ isPlatformAdmin: vi.fn() }))

describe('GET /api/admin/platform/document-templates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { GET } = await import('@/app/api/admin/platform/document-templates/route')
    const res = await GET()
    expect(res!.status).toBe(401)
  })

  it('403 for non-admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(false)
    const { GET } = await import('@/app/api/admin/platform/document-templates/route')
    const res = await GET()
    expect(res!.status).toBe(403)
  })

  it('returns items for admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'a' } } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(true)
    vi.mocked(prisma.documentTemplate.findMany).mockResolvedValue([{ id: 't1' }] as any)
    const { GET } = await import('@/app/api/admin/platform/document-templates/route')
    const res = await GET()
    expect(res!.status).toBe(200)
    const body = await res!.json()
    expect(body.items).toHaveLength(1)
  })
})

describe('POST /api/admin/platform/document-templates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('403 for non-admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(false)
    const { POST } = await import('@/app/api/admin/platform/document-templates/route')
    const req = new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ title: 'T', scope: 'individual', layoutKey: 'explanation' }) })
    const res = await POST(req as any)
    expect(res!.status).toBe(403)
  })

  it('400 when required fields missing', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'a' } } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(true)
    const { POST } = await import('@/app/api/admin/platform/document-templates/route')
    const req = new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ category: 'X' }) })
    const res = await POST(req as any)
    expect(res!.status).toBe(400)
  })

  it('creates a template for admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'a' } } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(true)
    vi.mocked(prisma.documentTemplate.create).mockResolvedValue({ id: 't9' } as any)
    const { POST } = await import('@/app/api/admin/platform/document-templates/route')
    const req = new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ title: 'T', scope: 'individual', layoutKey: 'explanation', variables: [] }) })
    const res = await POST(req as any)
    expect(res!.status).toBe(201)
  })
})
