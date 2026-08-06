import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getActiveOrgId } from '@/lib/active-org'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Активная группа (та же, что в левом переключателе), а не «первая по дате»:
  // формы создания заявления/собрания вешают документ именно на неё.
  return NextResponse.json({ orgId: await getActiveOrgId(session.user.id) })
}
