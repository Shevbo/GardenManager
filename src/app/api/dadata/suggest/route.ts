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
    const data = await r.json() as { suggestions?: Array<{ value: string; data: unknown }> }
    return NextResponse.json({ suggestions: data.suggestions ?? [] })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
