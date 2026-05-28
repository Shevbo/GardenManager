import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

const COOKIE_NAME = 'garden_active_org'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { orgId } = body as { orgId?: string | null }

  if (orgId) {
    const m = await prisma.membership.findFirst({
      where: { userId: session.user.id, orgId },
    })
    if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true, orgId: orgId ?? null })
  if (orgId) {
    res.cookies.set(COOKIE_NAME, orgId, {
      httpOnly: false, sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/',
    })
  } else {
    res.cookies.delete(COOKIE_NAME)
  }
  return res
}
