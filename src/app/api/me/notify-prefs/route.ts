import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { mergePrefs } from '@/lib/notify-labels'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notifyPrefs: true } })
  return NextResponse.json({ prefs: mergePrefs(user?.notifyPrefs) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { prefs } = body as { prefs?: unknown }

  // Normalize through mergePrefs so only known keys/booleans are stored.
  const clean = mergePrefs(prefs)
  await prisma.user.update({ where: { id: session.user.id }, data: { notifyPrefs: clean } })
  return NextResponse.json({ ok: true, prefs: clean })
}
