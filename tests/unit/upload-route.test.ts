import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock storage
vi.mock('@/lib/storage', () => ({
  getUploadUrl: vi.fn().mockResolvedValue('https://s3.example.com/upload-url'),
  buildKey: vi.fn().mockReturnValue('orgs/org1/petitions/p1/123-file.pdf'),
}))

import { auth } from '@/lib/auth'
import { POST } from '@/app/api/upload/route'

const mockRequest = (body: unknown) =>
  new Request('http://localhost/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any

describe('upload route', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(mockRequest({ filename: 'test.pdf', contentType: 'application/pdf', petitionId: 'p1', orgId: 'org1', size: 100 }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for disallowed content type', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1' } as any)
    const res = await POST(mockRequest({ filename: 'virus.exe', contentType: 'application/x-msdownload', petitionId: 'p1', orgId: 'org1', size: 100 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('не разрешён')
  })

  it('returns 400 when size missing', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1' } as any)
    const res = await POST(mockRequest({ filename: 'file.pdf', contentType: 'application/pdf', petitionId: 'p1', orgId: 'org1' }))
    expect(res.status).toBe(400)
  })

  it('returns 403 when user not in org', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null)
    const res = await POST(mockRequest({ filename: 'file.pdf', contentType: 'application/pdf', petitionId: 'p1', orgId: 'org1', size: 100 }))
    expect(res.status).toBe(403)
  })

  it('returns upload URL for valid request', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: 'm1' } as any)
    const res = await POST(mockRequest({ filename: 'doc.pdf', contentType: 'application/pdf', petitionId: 'p1', orgId: 'org1', size: 1000 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.uploadUrl).toBe('https://s3.example.com/upload-url')
    expect(body.key).toBeTruthy()
  })
})
