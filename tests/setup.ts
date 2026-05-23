import { vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    petition: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    petitionSignature: { deleteMany: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    user: { findFirst: vi.fn(), create: vi.fn() },
    membership: { findFirst: vi.fn() },
  },
}))
