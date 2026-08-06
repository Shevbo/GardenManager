import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'
import { reportExtFailure, __resetExtAlertState } from './ext-alert'

vi.mock('@/lib/permissions', () => ({
  getPlatformAdminUsers: vi.fn(async () => [{ id: 'admin1', name: 'Борис' }]),
}))

describe('reportExtFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetExtAlertState()
  })

  it('creates an in-app notification for each platform admin', async () => {
    await reportExtFailure('smtp', new Error('AUTH failed'), 0)
    expect(prisma.notification.create).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(prisma.notification.create).mock.calls[0][0] as { data: Record<string, unknown> }
    expect(arg.data.userId).toBe('admin1')
    expect(String(arg.data.title)).toContain('smtp')
  })

  it('honours the cooldown per service', async () => {
    await reportExtFailure('smtp', new Error('boom'), 0)
    await reportExtFailure('smtp', new Error('boom again'), 1000) // внутри окна
    expect(prisma.notification.create).toHaveBeenCalledTimes(1)
    await reportExtFailure('smtp', new Error('boom later'), 31 * 60 * 1000) // окно прошло
    expect(prisma.notification.create).toHaveBeenCalledTimes(2)
  })

  it('tracks services independently', async () => {
    await reportExtFailure('smtp', new Error('a'), 0)
    await reportExtFailure('dadata', new Error('b'), 0)
    expect(prisma.notification.create).toHaveBeenCalledTimes(2)
  })

  it('never throws even if the DB write fails', async () => {
    vi.mocked(prisma.notification.create).mockRejectedValue(new Error('db down'))
    await expect(reportExtFailure('sms', new Error('x'), 0)).resolves.toBeUndefined()
  })
})
