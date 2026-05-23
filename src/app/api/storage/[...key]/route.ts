import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getDownloadUrl } from '@/lib/storage'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key: keySegments } = await params
  const key = keySegments.join('/')

  // Verify the file belongs to a petition the user has membership in
  // Key format: orgs/<orgId>/petitions/<petitionId>/...
  const parts = key.split('/')
  const orgId = parts[1]

  if (!orgId) return NextResponse.json({ error: 'Invalid key' }, { status: 400 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = await getDownloadUrl(key)
  return NextResponse.redirect(url)
}
