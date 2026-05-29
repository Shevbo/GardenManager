import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const dbMs = Date.now() - start

    return NextResponse.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: { ok: true, latencyMs: dbMs },
      env: {
        node: process.version,
        nextauth: !!process.env.NEXTAUTH_URL,
        bridge: !!process.env.SHECTORY_AUTH_BRIDGE_SECRET,
        dadata: !!process.env.DADATA_API_KEY,
        sms: !!process.env.SMSC_API_TOKEN,
        email: !!process.env.UNISENDER_API_TOKEN,
        telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      },
    })
  } catch (e) {
    return NextResponse.json({
      status: 'error',
      db: { ok: false, error: (e as Error).message },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}
