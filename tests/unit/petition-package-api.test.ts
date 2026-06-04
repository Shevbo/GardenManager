import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/permissions'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/permissions', () => ({
  isPlatformAdmin: vi.fn(),
  requirePhoneVerified: vi.fn().mockResolvedValue(null),
}))

// Mock renderPackagePdf so we don't actually render PDFs in unit tests
vi.mock('@/lib/pdf/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/pdf/index')>()
  return {
    ...actual,
    renderPackagePdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-mock')),
    buildRegistryRows: actual.buildRegistryRows,
  }
})

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

// ---------------------------------------------------------------------------
// GET /api/petitions/[id]/appendices
// ---------------------------------------------------------------------------
describe('GET /api/petitions/[id]/appendices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { GET } = await import('@/app/api/petitions/[id]/appendices/route')
    const res = await GET(new Request('http://localhost') as any, ctx('p1'))
    expect(res.status).toBe(401)
  })

  it('404 when petition not found', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.petition.findUnique).mockResolvedValue(null as any)
    const { GET } = await import('@/app/api/petitions/[id]/appendices/route')
    const res = await GET(new Request('http://localhost') as any, ctx('p1'))
    expect(res.status).toBe(404)
  })

  it('403 when requester is not admin member and not platform admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({ id: 'p1', orgId: 'org1' } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(false)
    const { GET } = await import('@/app/api/petitions/[id]/appendices/route')
    const res = await GET(new Request('http://localhost') as any, ctx('p1'))
    expect(res.status).toBe(403)
  })

  it('200 returns signed appendices for org_admin member', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({ id: 'p1', orgId: 'org1' } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1', role: 'org_admin' } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(false)
    vi.mocked(prisma.generatedDocument.findMany).mockResolvedValue([
      {
        id: 'd1',
        title: 'Приложение 1',
        status: 'signed',
        user: { name: 'Иван Иванов' },
        template: { title: 'Протокол' },
        signedAt: new Date('2026-05-01T10:00:00Z'),
      },
    ] as any)
    const { GET } = await import('@/app/api/petitions/[id]/appendices/route')
    const res = await GET(new Request('http://localhost') as any, ctx('p1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].id).toBe('d1')
  })

  it('200 returns appendices for platform admin (no org membership)', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u2' } } as any)
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({ id: 'p1', orgId: 'org1' } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(true)
    vi.mocked(prisma.generatedDocument.findMany).mockResolvedValue([] as any)
    const { GET } = await import('@/app/api/petitions/[id]/appendices/route')
    const res = await GET(new Request('http://localhost') as any, ctx('p1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// GET /api/petitions/[id]/package
// ---------------------------------------------------------------------------
describe('GET /api/petitions/[id]/package', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { GET } = await import('@/app/api/petitions/[id]/package/route')
    const res = await GET(new Request('http://localhost') as any, ctx('p1'))
    expect(res.status).toBe(401)
  })

  it('404 when petition not found', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.petition.findUnique).mockResolvedValue(null as any)
    const { GET } = await import('@/app/api/petitions/[id]/package/route')
    const res = await GET(new Request('http://localhost') as any, ctx('p1'))
    expect(res.status).toBe(404)
  })

  it('403 when requester is a regular member (not admin role)', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({
      id: 'p1', orgId: 'org1',
      title: 'Петиция', finalText: 'Текст',
      draftText: null, recipient: null,
      org: { name: 'ЖК Сад' },
      signatures: [],
    } as any)
    // membership.findFirst for admin-role check returns null (not an admin)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(false)
    const { GET } = await import('@/app/api/petitions/[id]/package/route')
    const res = await GET(new Request('http://localhost') as any, ctx('p1'))
    expect(res.status).toBe(403)
  })

  it('200 returns PDF for org_admin — guards pass, content-type is application/pdf', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({
      id: 'p1', orgId: 'org1',
      title: 'Петиция', finalText: 'Текст',
      draftText: null, recipient: 'Главе управы',
      org: { name: 'ЖК Сад' },
      signatures: [],
    } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1', role: 'org_admin' } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(false)
    vi.mocked(prisma.membership.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.generatedDocument.findMany).mockResolvedValue([] as any)
    const { GET } = await import('@/app/api/petitions/[id]/package/route')
    const res = await GET(new Request('http://localhost') as any, ctx('p1'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('package-p1.pdf')
  })

  it('200 returns PDF for platform admin (no org membership)', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u2' } } as any)
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({
      id: 'p2', orgId: 'org1',
      title: 'Петиция', finalText: null,
      draftText: 'Черновик', recipient: null,
      org: { name: 'ЖК Сад' },
      signatures: [],
    } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(true)
    vi.mocked(prisma.membership.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.generatedDocument.findMany).mockResolvedValue([] as any)
    const { GET } = await import('@/app/api/petitions/[id]/package/route')
    const res = await GET(new Request('http://localhost') as any, ctx('p2'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })
})
