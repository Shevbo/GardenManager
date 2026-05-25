import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

describe('GET /api/activities', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const { GET } = await import('@/app/api/activities/route')
    const req = new Request('http://localhost/api/activities')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
  })

  it('returns activities list', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      { id: 'a1', name: 'Автомобилист', orgId: null, createdAt: new Date(), _count: { memberships: 3 }, memberships: [] },
    ] as any)
    const { GET } = await import('@/app/api/activities/route')
    const req = new Request('http://localhost/api/activities')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.activities).toHaveLength(1)
    expect(data.activities[0].name).toBe('Автомобилист')
  })
})

describe('POST /api/activities', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 for non-platform-admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null)
    const { POST } = await import('@/app/api/activities/route')
    const req = new Request('http://localhost/api/activities', {
      method: 'POST',
      body: JSON.stringify({ name: 'Тест' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })

  it('creates activity for platform_admin', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin1' } } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1', role: 'platform_admin' } as any)
    vi.mocked(prisma.activity.create).mockResolvedValue(
      { id: 'a1', name: 'Инвалид', orgId: null, createdAt: new Date() } as any
    )
    const { POST } = await import('@/app/api/activities/route')
    const req = new Request('http://localhost/api/activities', {
      method: 'POST',
      body: JSON.stringify({ name: 'Инвалид' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe('Инвалид')
  })
})

describe('POST /api/activities/[id]/join', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 without consent', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.activity.findUnique).mockResolvedValue({ id: 'a1', name: 'Тест' } as any)
    const { POST } = await import('@/app/api/activities/[id]/join/route')
    const req = new Request('http://localhost/api/activities/a1/join', {
      method: 'POST',
      body: JSON.stringify({ consent: false }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any, { params: Promise.resolve({ id: 'a1' }) })
    expect(res.status).toBe(400)
  })

  it('creates ActivityMembership on consent', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.activity.findUnique).mockResolvedValue({ id: 'a1', name: 'Тест' } as any)
    vi.mocked(prisma.activityMembership.upsert).mockResolvedValue(
      { id: 'am1', activityId: 'a1', userId: 'u1', joinedAt: new Date() } as any
    )
    const { POST } = await import('@/app/api/activities/[id]/join/route')
    const req = new Request('http://localhost/api/activities/a1/join', {
      method: 'POST',
      body: JSON.stringify({ consent: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any, { params: Promise.resolve({ id: 'a1' }) })
    expect(res.status).toBe(201)
  })
})
