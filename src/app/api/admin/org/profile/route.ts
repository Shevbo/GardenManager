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
  const { orgId, description, mapEmbedUrl } = body as { orgId?: string; description?: string | null; mapEmbedUrl?: string | null }

  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  if (!(await isOrgAdmin(session.user.id, orgId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data: { description?: string | null; mapEmbedUrl?: string | null } = {}

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

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const org = await prisma.organization.update({
    where: { id: orgId }, data,
    select: { id: true, description: true, mapEmbedUrl: true },
  })
  return NextResponse.json({ org })
}
