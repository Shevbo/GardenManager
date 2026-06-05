/**
 * QA harness env bootstrap: loads DATABASE_URL + NEXTAUTH_SECRET from Keymaster
 * (same source the app uses), exposes a prisma client and the secret.
 * Run with `.env` sourced so KEYMASTER_REQUESTER is the approved name.
 */
import { bootstrapSecrets } from '../../src/lib/keymaster'

let _prisma: import('@prisma/client').PrismaClient | null = null
let _secret: string | null = null

export async function initEnv() {
  if (_prisma && _secret) return { prisma: _prisma, secret: _secret }
  const r = await bootstrapSecrets({ DATABASE_URL: 'GARDEN_DATABASE_URL', NEXTAUTH_SECRET: 'GARDEN_NEXTAUTH_SECRET' })
  if (!process.env.DATABASE_URL || !process.env.NEXTAUTH_SECRET) {
    throw new Error('Keymaster bootstrap failed: ' + JSON.stringify(r.failed))
  }
  const { PrismaClient } = await import('@prisma/client')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  _prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
  _secret = process.env.NEXTAUTH_SECRET
  return { prisma: _prisma, secret: _secret }
}

export const BASE = process.env.QA_BASE ?? 'http://127.0.0.1:3003'
