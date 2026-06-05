/**
 * Web search for the AI lawyer, via the federation Lineman search endpoint.
 * Keyless — egress + engine live centrally in Lineman (no external platform, no API key).
 * Endpoint (klod-access): GET {LAWYER_SEARCH_URL}?q=<query>&limit=N
 *   → { query, count, results: [{ title, url, snippet }] }
 * Disabled (no-op) until `LAWYER_SEARCH_URL` is configured.
 */
const SEARCH_URL = process.env.LAWYER_SEARCH_URL // e.g. http://10.66.0.1:9090/api/search

export function webSearchEnabled(): boolean {
  return !!SEARCH_URL
}

interface SearchResult { title?: string; url?: string; snippet?: string }

/** Runs a web search and returns a compact text digest of results (or '' on any failure). */
export async function webSearch(query: string): Promise<string> {
  if (!SEARCH_URL) return ''
  try {
    const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&limit=6`
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return ''
    const data = await res.json().catch(() => null) as { results?: SearchResult[] } | null
    const results = data?.results ?? []
    if (results.length === 0) return ''
    return results.slice(0, 6)
      .map(r => `• ${r.title ?? ''} — ${r.snippet ?? ''} (${r.url ?? ''})`.trim())
      .join('\n')
      .slice(0, 3500)
  } catch {
    return ''
  }
}
