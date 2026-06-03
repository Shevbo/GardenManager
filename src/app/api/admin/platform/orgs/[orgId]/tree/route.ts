import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function GET(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orgId } = await params

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true, name: true, type: true, slug: true,
      buildings: {
        orderBy: { address: 'asc' },
        select: {
          id: true, address: true, addressNormalized: true, createdAt: true,
          apartments: {
            orderBy: { number: 'asc' },
            select: {
              id: true, number: true, floor: true, entrance: true, areaSqm: true,
              memberships: {
                select: {
                  id: true, role: true, isOwner: true, areaSqm: true, verifiedAt: true,
                  user: { select: { id: true, email: true, name: true, phone: true, phoneVerified: true } },
                },
              },
            },
          },
        },
      },
      memberships: {
        where: { apartmentId: null },
        select: {
          id: true, role: true, isOwner: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  })

  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  return NextResponse.json({ org })
}
