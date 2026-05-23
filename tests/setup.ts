import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const makeMock = () => ({
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
})

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn((fn: any) => (typeof fn === 'function' ? fn({}) : Promise.all(fn))),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    organization: makeMock(),
    building: makeMock(),
    apartment: makeMock(),
    user: makeMock(),
    account: makeMock(),
    session: makeMock(),
    verificationToken: makeMock(),
    membership: makeMock(),
    petition: makeMock(),
    petitionMaterial: makeMock(),
    petitionComment: makeMock(),
    petitionAIRevision: makeMock(),
    petitionSignature: makeMock(),
  },
}))
