import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

const COOKIE_NAME = 'garden_active_membership'
const LEGACY_COOKIE_NAME = 'garden_active_org'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  // Preferred: a concrete membership (a specific apartment). `orgId` is still
  // accepted for the group tabs, which switch by group — it resolves to the
  // user's first membership in that group.
  const { membershipId, orgId } = body as { membershipId?: string | null; orgId?: string | null }

  let resolvedId: string | null = membershipId ?? null

  if (!resolvedId && orgId) {
    const m = await prisma.membership.findFirst({
      where: { userId, orgId }, orderBy: { id: 'asc' }, select: { id: true },
    })
    if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    resolvedId = m.id
  }

  if (resolvedId) {
    const m = await prisma.membership.findFirst({
      where: { id: resolvedId, userId }, select: { id: true },
    })
    if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true, membershipId: resolvedId })
  if (resolvedId) {
    res.cookies.set(COOKIE_NAME, resolvedId, {
      httpOnly: false, sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/',
    })
  } else {
    res.cookies.delete(COOKIE_NAME)
  }
  // Drop the legacy org cookie so it can't shadow the membership selection.
  res.cookies.delete(LEGACY_COOKIE_NAME)
  return res
}
