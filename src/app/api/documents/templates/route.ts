import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await prisma.documentTemplate.findMany({ where: { scope: 'individual', isActive: true }, orderBy: { category: 'asc' } })
  return NextResponse.json({ items })
}
