import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { hashPassword, validatePasswordPolicy } from '@/lib/local-password'

/**
 * Задать/сменить локальный пароль garden-аккаунта.
 * Если пароль уже установлен — требуется текущий; если его ещё нет
 * (аккаунт заведён по коду до фичи паролей) — достаточно активной сессии
 * (личность уже доказана кодом на email).
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string }

  if (typeof newPassword !== 'string' || !newPassword) {
    return NextResponse.json({ error: 'Укажите новый пароль' }, { status: 400 })
  }
  const policyError = validatePasswordPolicy(newPassword)
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.password) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
      return NextResponse.json({ error: 'Текущий пароль не подходит' }, { status: 403 })
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: await hashPassword(newPassword) },
  })
  return NextResponse.json({ ok: true, hadPassword: !!user.password })
}
