import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Active org types for pickers — available to any authenticated user (the org
// profile editor is used by org admins, not only platform admins).
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const types = await prisma.orgTypeRef.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    select: { code: true, label: true },
  })
  return NextResponse.json({ types })
}
