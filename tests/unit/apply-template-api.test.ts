import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

const makeReq = (body: unknown) =>
  new Request('http://localhost/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const makeGetReq = () => new Request('http://localhost/x', { method: 'GET' })

const params = Promise.resolve({ id: 'p1' })

describe('GET /api/petitions/[id]/apply-template', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { GET } = await import('@/app/api/petitions/[id]/apply-template/route')
    const res = await GET(makeGetReq() as any, { params })
    expect(res.status).toBe(401)
  })

  it('returns templates and profile for authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.documentTemplate.findMany).mockResolvedValue([
      { id: 't1', title: 'Коллективная жалоба', scope: 'collective', isActive: true },
    ] as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: 'Иван Иванов',
      phone: '+79001234567',
      email: 'ivan@example.com',
    } as any)
    const { GET } = await import('@/app/api/petitions/[id]/apply-template/route')
    const res = await GET(makeGetReq() as any, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.templates).toHaveLength(1)
    expect(body.templates[0].id).toBe('t1')
    expect(body.profile.name).toBe('Иван Иванов')
  })
})

describe('POST /api/petitions/[id]/apply-template', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const { POST } = await import('@/app/api/petitions/[id]/apply-template/route')
    const res = await POST(makeReq({ templateId: 't1', values: {} }) as any, { params })
    expect(res.status).toBe(401)
  })

  it('400 when templateId is missing', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    const { POST } = await import('@/app/api/petitions/[id]/apply-template/route')
    const res = await POST(makeReq({}) as any, { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('templateId required')
  })

  it('400 with missing field labels when required variable is empty', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.documentTemplate.findUnique).mockResolvedValue({
      id: 't1',
      bodyTemplate: 'Кому: {{recipient}}',
      variables: [{ name: 'recipient', label: 'Кому', type: 'text', required: true, source: 'manual' }],
    } as any)
    const { POST } = await import('@/app/api/petitions/[id]/apply-template/route')
    const res = await POST(makeReq({ templateId: 't1', values: {} }) as any, { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.missing).toContain('Кому')
  })

  it('200 updates petition when all required fields filled', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.documentTemplate.findUnique).mockResolvedValue({
      id: 't1',
      bodyTemplate: 'Кому: {{recipient}}\nОт: {{applicant_name}}',
      variables: [
        { name: 'recipient', label: 'Кому', type: 'text', required: true, source: 'manual' },
        { name: 'applicant_name', label: 'ФИО заявителя', type: 'text', required: true, source: 'profile' },
      ],
    } as any)
    vi.mocked(prisma.petition.update).mockResolvedValue({
      id: 'p1',
      title: 'Тест',
      draftText: 'Кому: Главе управы\nОт: Иван Иванов',
      recipient: 'Главе управы',
      templateId: 't1',
      fieldValues: { recipient: 'Главе управы', applicant_name: 'Иван Иванов' },
    } as any)
    const { POST } = await import('@/app/api/petitions/[id]/apply-template/route')
    const res = await POST(
      makeReq({ templateId: 't1', values: { recipient: 'Главе управы', applicant_name: 'Иван Иванов' } }) as any,
      { params }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.draftText).toBe('Кому: Главе управы\nОт: Иван Иванов')
    expect(body.templateId).toBe('t1')
    expect(prisma.petition.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ templateId: 't1', recipient: 'Главе управы' }),
      })
    )
  })
})
