import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/sms', () => ({
  generateOtp: vi.fn(() => '654321'),
  sendSms: vi.fn().mockResolvedValue(undefined),
}))

describe('POST /api/profile/ownership/declare-request', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when no session', async () => {
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const { POST } = await import('@/app/api/profile/ownership/declare-request/route')
    const req = new Request('http://localhost/api/profile/ownership/declare-request', {
      method: 'POST', body: JSON.stringify({ membershipId: 'm1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('returns 400 when membershipId missing', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    const { POST } = await import('@/app/api/profile/ownership/declare-request/route')
    const req = new Request('http://localhost/api/profile/ownership/declare-request', {
      method: 'POST', body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 403 when membership does not belong to user', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      id: 'm1', userId: 'other-user',
    } as any)
    const { POST } = await import('@/app/api/profile/ownership/declare-request/route')
    const req = new Request('http://localhost/api/profile/ownership/declare-request', {
      method: 'POST', body: JSON.stringify({ membershipId: 'm1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })

  it('returns 400 when phone not verified', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      id: 'm1', userId: 'u1',
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1', phone: null, phoneVerified: null,
    } as any)
    const { POST } = await import('@/app/api/profile/ownership/declare-request/route')
    const req = new Request('http://localhost/api/profile/ownership/declare-request', {
      method: 'POST', body: JSON.stringify({ membershipId: 'm1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('phone_not_verified')
  })

  it('generates OTP and sends SMS', async () => {
    const { sendSms } = await import('@/lib/sms')
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      id: 'm1', userId: 'u1',
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1', phone: '+79991112233', phoneVerified: new Date(),
    } as any)
    vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(prisma.verificationToken.create).mockResolvedValue({} as any)

    const { POST } = await import('@/app/api/profile/ownership/declare-request/route')
    const req = new Request('http://localhost/api/profile/ownership/declare-request', {
      method: 'POST', body: JSON.stringify({ membershipId: 'm1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(vi.mocked(sendSms)).toHaveBeenCalledWith('+79991112233', expect.stringContaining('654321'))
  })
})

describe('POST /api/profile/ownership/declare-verify', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when no OTP token found', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      id: 'm1', userId: 'u1',
    } as any)
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue(null)
    const { POST } = await import('@/app/api/profile/ownership/declare-verify/route')
    const req = new Request('http://localhost/api/profile/ownership/declare-verify', {
      method: 'POST',
      body: JSON.stringify({
        membershipId: 'm1', otp: '111111',
        declaredText: 'I confirm', areaSqm: 50,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('creates declaration on valid OTP', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      id: 'm1', userId: 'u1',
    } as any)
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
      identifier: 'ownership:u1:m1', token: '654321', expires: new Date(Date.now() + 60_000),
    } as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { id: 'decl1' },
    ] as any)

    const { POST } = await import('@/app/api/profile/ownership/declare-verify/route')
    const req = new Request('http://localhost/api/profile/ownership/declare-verify', {
      method: 'POST',
      body: JSON.stringify({
        membershipId: 'm1', otp: '654321',
        declaredText: 'I confirm parameters', areaSqm: 55.5,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})
