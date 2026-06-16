import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isPetitionStatus, ALL_STATUSES } from '@/lib/petition-status'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ isPlatformAdmin: vi.fn() }))

import { auth } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import { PATCH, DELETE } from '@/app/api/admin/platform/petitions/[id]/route'

function req(body?: unknown) {
  return { json: async () => { if (body === undefined) throw new Error('no body'); return body } } as any
}
const ctx = (id = 'p1') => ({ params: Promise.resolve({ id }) })

describe('petition-status helpers', () => {
  it('ALL_STATUSES is the full workflow', () => {
    expect(ALL_STATUSES).toEqual(['DRAFT', 'DISCUSSION', 'AI_REVISION', 'SIGNING', 'CLOSED', 'EXPORTED'])
  })
  it('isPetitionStatus validates membership', () => {
    expect(isPetitionStatus('SIGNING')).toBe(true)
    expect(isPetitionStatus('BOGUS')).toBe(false)
    expect(isPetitionStatus(42)).toBe(false)
  })
})

describe('admin petition repository API (god mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin1' } } as any)
    vi.mocked(isPlatformAdmin).mockResolvedValue(true)
  })

  it('rejects non-superadmin on PATCH', async () => {
    vi.mocked(isPlatformAdmin).mockResolvedValue(false)
    const res = await PATCH(req({ status: 'CLOSED' }), ctx())
    expect(res.status).toBe(403)
  })

  it('rejects unauthenticated on DELETE', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await DELETE(req(), ctx())
    expect(res.status).toBe(401)
  })

  it('rejects an invalid status', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({ id: 'p1' } as any)
    const res = await PATCH(req({ status: 'NOPE' }), ctx())
    expect(res.status).toBe(400)
  })

  it('allows any workflow jump (DRAFT → EXPORTED) for superadmin', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({ id: 'p1' } as any)
    vi.mocked(prisma.petition.update).mockResolvedValue({ id: 'p1', status: 'EXPORTED' } as any)
    const res = await PATCH(req({ status: 'EXPORTED' }), ctx())
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.petition.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: expect.objectContaining({ status: 'EXPORTED' }) })
    )
  })

  it('edits title even outside DRAFT (no workflow gate)', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({ id: 'p1' } as any)
    vi.mocked(prisma.petition.update).mockResolvedValue({ id: 'p1' } as any)
    const res = await PATCH(req({ title: '  New title  ' }), ctx())
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.petition.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'New title' }) })
    )
  })

  it('force-deletes a petition with signatures (detaches docs, deletes signatures, then petition)', async () => {
    vi.mocked(prisma.petition.findUnique).mockResolvedValue({ id: 'p1' } as any)
    const tx = vi.mocked(prisma.$transaction).mockResolvedValue([] as any)
    const res = await DELETE(req(), ctx())
    expect(res.status).toBe(200)
    expect(tx).toHaveBeenCalledOnce()
  })
})
