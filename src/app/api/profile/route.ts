import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, phone: true, phoneVerified: true, address: true, contactDisclosure: true },
  })

  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, address, contactDisclosure } = body as { name?: string; address?: string; contactDisclosure?: string }
  const validDisclosure = ['registry', 'on_request', 'none']

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name    !== undefined && { name:    name.trim()    || null }),
      ...(address !== undefined && { address: address.trim() || null }),
      ...(contactDisclosure !== undefined && validDisclosure.includes(contactDisclosure) && { contactDisclosure }),
    },
    select: { id: true, name: true, address: true, contactDisclosure: true },
  })

  return NextResponse.json(updated)
}
