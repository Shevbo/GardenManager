import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/lib/auth'
import { requirePhoneVerified, isPlatformAdmin } from '@/lib/permissions'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/permissions', () => ({
  requirePhoneVerified: vi.fn(),
  isPlatformAdmin: vi.fn(),
}))

// helper to build route params
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

const makeReq = (body: unknown, method = 'POST') =>
  new Request('http://localhost/x', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

// ---------------------------------------------------------------------------
// GET /api/documents
// ---------------------------------------------------------------------------
describe('GET /api/documents', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { GET } = await import('@/app/api/documents/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns items for authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.generatedDocument.findMany).mockResolvedValue([
      { id: 'd1', title: 'Моя жалоба', status: 'draft' },
    ] as any)
    const { GET } = await import('@/app/api/documents/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].id).toBe('d1')
  })
})

// ---------------------------------------------------------------------------
// POST /api/documents
// ---------------------------------------------------------------------------
describe('POST /api/documents', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { POST } = await import('@/app/api/documents/route')
    const res = await POST(makeReq({ templateId: 't1' }) as any)
    expect(res.status).toBe(401)
  })

  it('400 when templateId is missing', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    const { POST } = await import('@/app/api/documents/route')
    const res = await POST(makeReq({}) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('templateId required')
  })

  it('404 when template does not exist', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.documentTemplate.findUnique).mockResolvedValue(null)
    const { POST } = await import('@/app/api/documents/route')
    const res = await POST(makeReq({ templateId: 'missing' }) as any)
    expect(res.status).toBe(404)
  })

  it('201 creates document with profile-prefilled fieldValues', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.documentTemplate.findUnique).mockResolvedValue({
      id: 't1',
      title: 'Обращение',
      layoutKey: 'explanation',
      variables: [
        { name: 'applicant_name', label: 'ФИО', type: 'text', required: true, source: 'profile' },
      ],
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: 'Пётр', phone: null, email: null } as any)
    vi.mocked(prisma.generatedDocument.create).mockResolvedValue({
      id: 'd9', status: 'draft', fieldValues: { applicant_name: 'Пётр' },
    } as any)
    const { POST } = await import('@/app/api/documents/route')
    const res = await POST(makeReq({ templateId: 't1' }) as any)
    expect(res.status).toBe(201)
    expect(prisma.generatedDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fieldValues: expect.objectContaining({ applicant_name: 'Пётр' }),
        }),
      })
    )
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/documents/[id]
// ---------------------------------------------------------------------------
describe('PATCH /api/documents/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { PATCH } = await import('@/app/api/documents/[id]/route')
    const res = await PATCH(makeReq({ title: 'X' }, 'PATCH') as any, ctx('d1'))
    expect(res!.status).toBe(401)
  })

  it('403 when not owner', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.generatedDocument.findUnique).mockResolvedValue({
      id: 'd1', userId: 'other', status: 'draft', title: 'Old', fieldValues: {},
    } as any)
    const { PATCH } = await import('@/app/api/documents/[id]/route')
    const res = await PATCH(makeReq({ title: 'X' }, 'PATCH') as any, ctx('d1'))
    expect(res!.status).toBe(403)
  })

  it('409 when document is already signed', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.generatedDocument.findUnique).mockResolvedValue({
      id: 'd1', userId: 'u1', status: 'signed', title: 'Old', fieldValues: {},
    } as any)
    const { PATCH } = await import('@/app/api/documents/[id]/route')
    const res = await PATCH(makeReq({ title: 'X' }, 'PATCH') as any, ctx('d1'))
    expect(res!.status).toBe(409)
  })

  it('200 updates when owner and draft', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.generatedDocument.findUnique).mockResolvedValue({
      id: 'd1', userId: 'u1', status: 'draft', title: 'Old', fieldValues: {},
    } as any)
    vi.mocked(prisma.generatedDocument.update).mockResolvedValue({
      id: 'd1', userId: 'u1', status: 'draft', title: 'New title', fieldValues: {},
    } as any)
    const { PATCH } = await import('@/app/api/documents/[id]/route')
    const res = await PATCH(makeReq({ title: 'New title' }, 'PATCH') as any, ctx('d1'))
    expect(res!.status).toBe(200)
    const body = await res!.json()
    expect(body.title).toBe('New title')
  })
})

// ---------------------------------------------------------------------------
// POST /api/documents/[id]/sign
// ---------------------------------------------------------------------------
describe('POST /api/documents/[id]/sign', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { POST } = await import('@/app/api/documents/[id]/sign/route')
    const res = await POST(makeReq({ legalConsent: true }) as any, ctx('d1'))
    expect(res.status).toBe(401)
  })

  it('400 when legalConsent is missing', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(requirePhoneVerified).mockResolvedValue(null)
    const { POST } = await import('@/app/api/documents/[id]/sign/route')
    const res = await POST(makeReq({}) as any, ctx('d1'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Необходимо принять условия')
  })

  it('200 signs document when all conditions met', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(requirePhoneVerified).mockResolvedValue(null)
    vi.mocked(prisma.generatedDocument.findUnique).mockResolvedValue({
      id: 'd1',
      userId: 'u1',
      status: 'draft',
      fieldValues: {},
      template: { variables: [] },
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1', phoneVerified: new Date(), emailVerified: null,
    } as any)
    vi.mocked(prisma.generatedDocument.update).mockResolvedValue({
      id: 'd1', status: 'signed', signedAt: new Date(), verifiedVia: 'sms',
    } as any)
    const { POST } = await import('@/app/api/documents/[id]/sign/route')
    const res = await POST(makeReq({ legalConsent: true }) as any, ctx('d1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('signed')
    expect(body.verifiedVia).toBe('sms')
  })
})

// ---------------------------------------------------------------------------
// GET /api/documents/[id]/export
// ---------------------------------------------------------------------------
describe('GET /api/documents/[id]/export', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { GET } = await import('@/app/api/documents/[id]/export/route')
    const req = new Request('http://localhost/x', { method: 'GET' })
    const res = await GET(req as any, ctx('d1'))
    expect(res.status).toBe(401)
  })

  it('403 when not owner and no petition', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.generatedDocument.findUnique).mockResolvedValue({
      id: 'd1', userId: 'other', petition: null,
      template: { layoutKey: 'explanation', variables: [] },
      fieldValues: {},
    } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(false)
    const { GET } = await import('@/app/api/documents/[id]/export/route')
    const req = new Request('http://localhost/x', { method: 'GET' })
    const res = await GET(req as any, ctx('d1'))
    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// GET /api/documents/templates
// ---------------------------------------------------------------------------
describe('GET /api/documents/templates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { GET } = await import('@/app/api/documents/templates/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns individual active templates for authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.documentTemplate.findMany).mockResolvedValue([
      { id: 't1', title: 'Индивидуальное обращение', scope: 'individual', isActive: true },
      { id: 't2', title: 'Объяснение', scope: 'individual', isActive: true },
    ] as any)
    const { GET } = await import('@/app/api/documents/templates/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(2)
    expect(prisma.documentTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scope: 'individual', isActive: true },
      })
    )
  })
})
