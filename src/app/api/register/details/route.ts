import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { normalizeAddress } from '@/lib/address-match'
import { notifyAdminNewRegistration } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { fullName, rawAddress, apartmentNumber, areaSqm } = body as {
    fullName?: string; rawAddress?: string
    apartmentNumber?: string; areaSqm?: number
  }

  if (!fullName?.trim()) {
    return NextResponse.json({ error: 'fullName required' }, { status: 400 })
  }
  if (!rawAddress?.trim()) {
    return NextResponse.json({ error: 'rawAddress required' }, { status: 400 })
  }

  const userId = session.user.id
  const normalized = normalizeAddress(rawAddress)
  const building = normalized
    ? await prisma.building.findUnique({ where: { addressNormalized: normalized } })
    : null

  if (building && building.orgId) {
    let apartmentId: string | null = null
    if (apartmentNumber?.trim()) {
      const apt = await prisma.apartment.upsert({
        where: { buildingId_number: { buildingId: building.id, number: apartmentNumber.trim() } },
        update: {},
        create: { buildingId: building.id, number: apartmentNumber.trim() },
      })
      apartmentId = apt.id
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { name: fullName.trim(), status: 'ACTIVE', profileCompleted: true },
      }),
      prisma.membership.create({
        data: {
          userId, orgId: building.orgId, apartmentId,
          role: 'owner', isOwner: true,
          areaSqm: areaSqm ?? undefined,
        },
      }),
    ])
    return NextResponse.json({ ok: true, mode: 'active' })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { name: fullName.trim(), status: 'PENDING', profileCompleted: true },
    }),
    prisma.pendingRegistration.upsert({
      where: { userId },
      update: {
        requestedAddress: rawAddress.trim(),
        addressNormalized: normalized,
        apartmentNumber: apartmentNumber?.trim() || null,
        areaSqm: areaSqm ?? null,
        status: 'PENDING',
      },
      create: {
        userId,
        requestedAddress: rawAddress.trim(),
        addressNormalized: normalized,
        apartmentNumber: apartmentNumber?.trim() || null,
        areaSqm: areaSqm ?? null,
      },
    }),
  ])
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
  notifyAdminNewRegistration({
    requestedAddress: rawAddress.trim(),
    userName: fullName.trim(),
    userEmail: user?.email ?? null,
    registrationId: userId,
    apartmentNumber: apartmentNumber?.trim() || null,
    areaSqm: areaSqm ?? null,
  }).catch(() => {})

  return NextResponse.json({ ok: true, mode: 'pending' })
}
