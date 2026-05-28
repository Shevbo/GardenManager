import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'
import { notifyUserApproved } from '@/lib/notifications'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { orgId, address } = body as { orgId?: string | null; address?: string }

  const pending = await prisma.pendingRegistration.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true } } },
  })
  if (!pending) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (pending.status !== 'PENDING') {
    return NextResponse.json({ error: 'already_processed' }, { status: 400 })
  }

  const normalized = pending.addressNormalized
  if (!normalized) {
    return NextResponse.json({ error: 'cannot approve: no normalized address' }, { status: 400 })
  }

  let building = await prisma.building.findUnique({ where: { addressNormalized: normalized } })
  if (!building) {
    building = await prisma.building.create({
      data: {
        address: address?.trim() || pending.requestedAddress,
        addressNormalized: normalized,
        orgId: orgId || null,
        createdBy: session.user.id,
      },
    })
  } else if (orgId && !building.orgId) {
    building = await prisma.building.update({
      where: { id: building.id },
      data: { orgId },
    })
  }

  const sameAddress = await prisma.pendingRegistration.findMany({
    where: { status: 'PENDING', addressNormalized: normalized },
    include: { user: { select: { id: true, email: true } } },
  })

  const approvedUsers: Array<{ email: string | null; userId: string }> = []
  for (const reg of sameAddress) {
    let apartmentId: string | null = null
    if (reg.apartmentNumber?.trim()) {
      const apt = await prisma.apartment.upsert({
        where: { buildingId_number: { buildingId: building.id, number: reg.apartmentNumber.trim() } },
        update: {},
        create: { buildingId: building.id, number: reg.apartmentNumber.trim() },
      })
      apartmentId = apt.id
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reg.userId },
        data: { status: 'ACTIVE' },
      }),
      ...(building.orgId
        ? [prisma.membership.upsert({
            where: { userId_orgId: { userId: reg.userId, orgId: building.orgId } },
            update: { apartmentId, areaSqm: reg.areaSqm ?? undefined },
            create: {
              userId: reg.userId,
              orgId: building.orgId,
              apartmentId,
              role: 'owner' as const,
              isOwner: reg.isOwner,
              areaSqm: reg.areaSqm ?? undefined,
            },
          })]
        : []),
      prisma.pendingRegistration.update({
        where: { id: reg.id },
        data: { status: 'APPROVED', reviewedBy: session.user.id, reviewedAt: new Date() },
      }),
    ])

    approvedUsers.push({ email: reg.user.email, userId: reg.userId })
  }

  const org = building.orgId
    ? await prisma.organization.findUnique({ where: { id: building.orgId }, select: { name: true } })
    : null
  for (const u of approvedUsers) {
    notifyUserApproved({
      email: u.email,
      address: building.address,
      orgName: org?.name ?? null,
    }).catch(() => {})
  }

  return NextResponse.json({
    ok: true,
    buildingId: building.id,
    approvedCount: approvedUsers.length,
  })
}
