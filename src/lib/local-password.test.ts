import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'
import { hashPassword, verifyLocalPassword, validatePasswordPolicy } from './local-password'

describe('local-password', () => {
  beforeEach(() => vi.clearAllMocks())

  it('политика: короче 8 — отказ, 8+ — ок', () => {
    expect(validatePasswordPolicy('1234567')).toContain('не короче 8')
    expect(validatePasswordPolicy('12345678')).toBeNull()
  })

  it('hash → verify: свой пароль подходит, чужой нет', async () => {
    const hash = await hashPassword('correct-horse-9')
    expect(hash.startsWith('$2')).toBe(true) // bcrypt
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'Т', password: hash } as never)
    expect(await verifyLocalPassword('a@b.c', 'correct-horse-9')).toEqual({ id: 'u1', email: 'a@b.c', name: 'Т' })
    expect(await verifyLocalPassword('a@b.c', 'wrong-password-1')).toBeNull()
  })

  it('нет юзера или нет пароля → null (уходим в мост)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    expect(await verifyLocalPassword('x@y.z', 'whatever123')).toBeNull()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', email: 'x@y.z', name: null, password: null } as never)
    expect(await verifyLocalPassword('x@y.z', 'whatever123')).toBeNull()
  })
})
