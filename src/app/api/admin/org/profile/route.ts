import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isOrgAdmin } from '@/lib/permissions'

/** Accept a Yandex map share URL or full <iframe> code; return a clean src URL. */
export function sanitizeYandexEmbed(input: string): string | null {
  let url = input.trim()
  const m = url.match(/src\s*=\s*["']([^"']+)["']/i)
  if (m) url = m[1]
  url = url.trim()
  if (!/^https:\/\//i.test(url)) return null
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host === 'yandex.ru' || host === 'yandex.com' || host.endsWith('.yandex.ru') || host.endsWith('.yandex.com')) {
      return url
    }
  } catch { /* invalid URL */ }
  return null
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { orgId, name, type, description, mapEmbedUrl, agendaVoteLimit } = body as { orgId?: string; name?: string; type?: string; description?: string | null; mapEmbedUrl?: string | null; agendaVoteLimit?: number }

  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  if (!(await isOrgAdmin(session.user.id, orgId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data: { name?: string; type?: string; description?: string | null; mapEmbedUrl?: string | null; agendaVoteLimit?: number } = {}

  if (typeof name === 'string' && name.trim()) data.name = name.trim()

  if (type !== undefined) {
    const ref = await prisma.orgTypeRef.findFirst({ where: { code: type, active: true }, select: { code: true } })
    if (!ref) return NextResponse.json({ error: 'Неизвестный тип организации' }, { status: 400 })
    data.type = ref.code
  }

  if (description !== undefined) {
    if (description && description.length > 4000) {
      return NextResponse.json({ error: 'Описание не длиннее 4000 символов' }, { status: 400 })
    }
    data.description = description?.trim() || null
  }

  if (mapEmbedUrl !== undefined) {
    if (!mapEmbedUrl || !mapEmbedUrl.trim()) {
      data.mapEmbedUrl = null
    } else {
      const clean = sanitizeYandexEmbed(mapEmbedUrl)
      if (!clean) return NextResponse.json({ error: 'Ссылка должна быть с Яндекс.Карт (yandex.ru/…)' }, { status: 400 })
      data.mapEmbedUrl = clean
    }
  }

  if (agendaVoteLimit !== undefined) {
    const n = Number(agendaVoteLimit)
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      return NextResponse.json({ error: 'Лимит голосов за темы — целое число от 1 до 20' }, { status: 400 })
    }
    data.agendaVoteLimit = n
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const org = await prisma.organization.update({
    where: { id: orgId }, data,
    select: { id: true, name: true, type: true, description: true, mapEmbedUrl: true, agendaVoteLimit: true },
  })
  return NextResponse.json({ org })
}
