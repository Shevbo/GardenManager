import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'

const DADATA_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'

/**
 * Подсказки адреса нужны на ПУБЛИЧНОМ шаге регистрации (мастер /register,
 * пользователь ещё без сессии) — поэтому сессия здесь не обязательна.
 * Чтобы открытый прокси не сжёг суточную квоту DaData, анонимные запросы
 * ограничены: по IP и общим потолком на процесс. Авторизованных не лимитируем.
 */
const anonPerIp = createRateLimiter(60, 60_000)
const anonGlobal = createRateLimiter(600, 60_000)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    const ip = clientIp(req.headers)
    const perIp = anonPerIp(ip)
    const global = anonGlobal('all')
    if (!perIp.allowed || !global.allowed) {
      const retryAfterSec = Math.max(perIp.retryAfterSec, global.retryAfterSec)
      return NextResponse.json(
        { suggestions: [], rateLimited: true },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      )
    }
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { query } = body as { query?: string }
  if (!query || query.length < 3) {
    return NextResponse.json({ suggestions: [] })
  }

  const token = process.env.DADATA_API_KEY
  if (!token) {
    return NextResponse.json({ suggestions: [], notConfigured: true })
  }

  try {
    const r = await fetch(DADATA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({ query, count: 6 }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!r.ok) {
      // Сбой провайдера ≠ «подсказок нет» — клиент должен предложить ручной ввод.
      const { reportExtFailure } = await import('@/lib/ext-alert')
      await reportExtFailure('dadata', new Error(`HTTP ${r.status}`))
      return NextResponse.json({ suggestions: [], failed: true })
    }
    type DaDataSuggestion = {
      value: string
      data: {
        kladr_id?: string | null
        fias_id?: string | null
        fias_level?: string | null
        qc?: string | null
      }
    }
    const data = await r.json() as { suggestions?: DaDataSuggestion[] }
    // Pass through minimal subset needed for UI badges (kladr_id, fias_id)
    const suggestions = (data.suggestions ?? []).map(s => ({
      value: s.value,
      data: {
        kladr_id: s.data?.kladr_id ?? null,
        fias_id: s.data?.fias_id ?? null,
        fias_level: s.data?.fias_level ?? null,
      },
    }))
    return NextResponse.json({ suggestions })
  } catch (e) {
    const { reportExtFailure } = await import('@/lib/ext-alert')
    await reportExtFailure('dadata', e)
    return NextResponse.json({ suggestions: [], failed: true })
  }
}
