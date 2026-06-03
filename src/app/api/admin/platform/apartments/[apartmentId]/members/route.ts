import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Role } from '@prisma/client'

const PLATFORM_ADMIN_ROLES: Role[] = ['platform_admin', 'coalition_admin']

async function isPlatformAdmin(userId: string): Promise<boolean> {
  const m = await prisma.membership.findFirst({
    where: { userId, role: { in: PLATFORM_ADMIN_ROLES } },
  })
  return !!m
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ apartmentId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { apartmentId } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, role = 'owner', isOwner = true } = body as {
    email?: string; role?: string; isOwner?: boolean
  }
  if (!email?.trim()) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    include: { building: { select: { orgId: true } } },
  })
  if (!apartment) return NextResponse.json({ error: 'Apartment not found' }, { status: 404 })

  const orgId = apartment.building.orgId

  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: 'insensitive' } },
    select: { id: true, name: true, email: true },
  })
  if (!user?.id) return NextResponse.json({ error: 'Пользователь с таким email не найден' }, { status: 404 })

  const existing = await prisma.membership.findFirst({
    where: { userId: user.id, orgId: orgId ?? undefined },
  })
  if (existing) {
    return NextResponse.json({ error: 'Пользователь уже является участником этой организации' }, { status: 409 })
  }

  const roleValue = (role as Role) ?? 'owner'

  const membership = await prisma.membership.create({
    data: { userId: user.id, orgId: orgId!, apartmentId, role: roleValue, isOwner },
    include: { user: { select: { id: true, email: true, name: true, phone: true, phoneVerified: true } } },
  })

  return NextResponse.json({ membership }, { status: 201 })
}
