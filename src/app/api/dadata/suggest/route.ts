import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const DADATA_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    })
    if (!r.ok) return NextResponse.json({ suggestions: [] })
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
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
