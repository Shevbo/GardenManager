import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { findBuildingForAddress } from '@/lib/building-lookup'
import { hashPassword, validatePasswordPolicy } from '@/lib/local-password'
import { notifyAdminNewRegistration } from '@/lib/notifications'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    email, otp, password, fullName, rawAddress,
    apartmentNumber, areaSqm,
  } = body as {
    email?: string; otp?: string; password?: string; fullName?: string; rawAddress?: string
    apartmentNumber?: string; areaSqm?: number
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'email invalid' }, { status: 400 })
  }
  if (!otp?.trim()) {
    return NextResponse.json({ error: 'otp required' }, { status: 400 })
  }
  if (!fullName?.trim()) {
    return NextResponse.json({ error: 'fullName required' }, { status: 400 })
  }
  if (!rawAddress?.trim()) {
    return NextResponse.json({ error: 'rawAddress required' }, { status: 400 })
  }
  // Пароль придумывается вместе с кодом (решение Бориса 2026-08-08).
  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Придумайте пароль — он нужен для входа на сайт.' }, { status: 400 })
  }
  const policyError = validatePasswordPolicy(password)
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 })
  const passwordHash = await hashPassword(password)

  const emailNorm = email.trim().toLowerCase()

  // Verify OTP without consuming (signIn will consume it later).
  // Ищем без фильтра по сроку, чтобы вежливо различить «не тот код» и «код истёк».
  const token = await prisma.verificationToken.findFirst({
    where: { identifier: emailNorm, token: otp.trim() },
  })
  if (!token) {
    return NextResponse.json(
      { error: 'Код не подходит. Пожалуйста, сверьтесь с самым свежим письмом — или запросите новый код.' },
      { status: 401 },
    )
  }
  if (token.expires <= new Date()) {
    return NextResponse.json(
      { error: 'Срок действия кода истёк. Ничего страшного — запросите новый, и мы сразу его пришлём.' },
      { status: 401 },
    )
  }

  // Check existing user
  const existing = await prisma.user.findUnique({ where: { email: emailNorm } })
  if (existing) {
    const m = await prisma.membership.findFirst({ where: { userId: existing.id } })
    if (m) {
      return NextResponse.json(
        { error: 'Email already registered', mode: 'already_registered' },
        { status: 409 }
      )
    }
  }

  // Тот же поиск, что и на шаге 1 — иначе «дом найден» на первом шаге
  // превращается в заявку на модерацию при отправке.
  const { normalized, building } = await findBuildingForAddress(rawAddress)

  // Treat building-without-org as pending: we have no Membership target.
  if (building && building.orgId) {
    const [user] = await prisma.$transaction(async (tx) => {
      const u = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { name: fullName.trim(), emailVerified: new Date(), status: 'ACTIVE', profileCompleted: true, password: passwordHash },
          })
        : await tx.user.create({
            data: {
              email: emailNorm, name: fullName.trim(), emailVerified: new Date(),
              status: 'ACTIVE', profileCompleted: true, password: passwordHash,
            },
          })

      let apartmentId: string | null = null
      if (apartmentNumber?.trim()) {
        const apt = await tx.apartment.upsert({
          where: { buildingId_number: { buildingId: building.id, number: apartmentNumber.trim() } },
          update: {},
          create: { buildingId: building.id, number: apartmentNumber.trim() },
        })
        apartmentId = apt.id
      }

      await tx.membership.create({
        data: {
          userId: u.id,
          orgId: building.orgId!,
          apartmentId,
          role: 'owner',
          isOwner: true,
          areaSqm: areaSqm ?? undefined,
        },
      })

      // Consume the OTP token; re-issue a short-lived one for the post-submit signIn call.
      await tx.verificationToken.deleteMany({ where: { identifier: emailNorm } })
      await tx.verificationToken.create({
        data: {
          identifier: emailNorm,
          token: otp.trim(),
          expires: new Date(Date.now() + 60_000),
        },
      })

      return [u]
    })

    return NextResponse.json({ ok: true, mode: 'active', userId: user.id }, { status: 201 })
  }

  // Pending flow
  const [user] = await prisma.$transaction(async (tx) => {
    const u = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: fullName.trim(),
            emailVerified: new Date(),
            status: 'PENDING',
            profileCompleted: true,
            password: passwordHash,
          },
        })
      : await tx.user.create({
          data: {
            email: emailNorm, name: fullName.trim(), emailVerified: new Date(),
            status: 'PENDING', profileCompleted: true, password: passwordHash,
          },
        })

    await tx.pendingRegistration.upsert({
      where: { userId: u.id },
      update: {
        requestedAddress: rawAddress.trim(),
        addressNormalized: normalized,
        apartmentNumber: apartmentNumber?.trim() || null,
        areaSqm: areaSqm ?? null,
        status: 'PENDING',
      },
      create: {
        userId: u.id,
        requestedAddress: rawAddress.trim(),
        addressNormalized: normalized,
        apartmentNumber: apartmentNumber?.trim() || null,
        areaSqm: areaSqm ?? null,
      },
    })

    await tx.verificationToken.deleteMany({ where: { identifier: emailNorm } })

    return [u]
  })

  notifyAdminNewRegistration({
    requestedAddress: rawAddress.trim(),
    userName: fullName.trim(),
    userEmail: emailNorm,
    registrationId: user.id,
    apartmentNumber: apartmentNumber?.trim() || null,
    areaSqm: areaSqm ?? null,
  }).catch(() => {})

  return NextResponse.json({ ok: true, mode: 'pending', userId: user.id }, { status: 201 })
}
