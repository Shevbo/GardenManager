import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'

describe('POST /api/register/submit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when otp missing', async () => {
    const { POST } = await import('@/app/api/register/submit/route')
    const req = new Request('http://localhost/api/register/submit', {
      method: 'POST',
      body: JSON.stringify({ email: 'x@y.z', rawAddress: 'Москва, ул. Садовая, д. 12' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 401 when OTP token not found', async () => {
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue(null)
    const { POST } = await import('@/app/api/register/submit/route')
    const req = new Request('http://localhost/api/register/submit', {
      method: 'POST',
      body: JSON.stringify({
        email: 'x@y.z', otp: '111111', fullName: 'Test',
        rawAddress: 'Москва, ул. Садовая, д. 12'
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('creates ACTIVE user + Membership when building matches', async () => {
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
      identifier: 'x@y.z', token: '111111', expires: new Date(Date.now() + 60_000),
    } as any)
    vi.mocked(prisma.building.findUnique).mockResolvedValue({
      id: 'b1', orgId: 'o1', address: 'Москва, Садовая 12', addressNormalized: 'москва ул садовая д 12',
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { id: 'u1', email: 'x@y.z', status: 'ACTIVE' },
    ] as any)

    const { POST } = await import('@/app/api/register/submit/route')
    const req = new Request('http://localhost/api/register/submit', {
      method: 'POST',
      body: JSON.stringify({
        email: 'x@y.z', otp: '111111', fullName: 'Test',
        rawAddress: 'Москва, ул. Садовая, д. 12',
        apartmentNumber: '47', areaSqm: 55.5,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.mode).toBe('active')
  })

  it('creates PENDING user + PendingRegistration when building not in DB', async () => {
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
      identifier: 'x@y.z', token: '111111', expires: new Date(Date.now() + 60_000),
    } as any)
    vi.mocked(prisma.building.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { id: 'u2', email: 'x@y.z', status: 'PENDING' },
    ] as any)

    const { POST } = await import('@/app/api/register/submit/route')
    const req = new Request('http://localhost/api/register/submit', {
      method: 'POST',
      body: JSON.stringify({
        email: 'x@y.z', otp: '111111', fullName: 'Test',
        rawAddress: 'Москва, ул. Новая, д. 5',
        apartmentNumber: '17',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.mode).toBe('pending')
  })

  it('returns 409 if user with that email already has Membership', async () => {
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
      identifier: 'x@y.z', token: '111111', expires: new Date(Date.now() + 60_000),
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', email: 'x@y.z' } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1' } as any)

    const { POST } = await import('@/app/api/register/submit/route')
    const req = new Request('http://localhost/api/register/submit', {
      method: 'POST',
      body: JSON.stringify({
        email: 'x@y.z', otp: '111111', fullName: 'Test',
        rawAddress: 'Москва, ул. Садовая, д. 12',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(409)
  })
})
