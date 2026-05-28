import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserActionBlockers } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blockers = await getUserActionBlockers(session.user.id)
  return NextResponse.json({
    userId: session.user.id,
    canAct: blockers.length === 0,
    blockers,
  })
}
