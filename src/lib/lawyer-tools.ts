/**
 * Web search for the AI lawyer, via the federation Lineman search proxy.
 * The Tavily key + geo-block live centrally in Lineman; the app only calls the proxy URL.
 * Disabled (no-op) until `LAWYER_SEARCH_URL` is configured — so it ships dark and is
 * activated by setting one env var once Lineman's /proxy/<search> endpoint is live.
 */
const SEARCH_URL = process.env.LAWYER_SEARCH_URL // e.g. http://10.66.0.1:9090/proxy/tavily
const AGENT_NAME = 'garden-manager'

export function webSearchEnabled(): boolean {
  return !!SEARCH_URL
}

/** Runs a web search and returns a compact text digest of results (or '' on any failure). */
export async function webSearch(query: string): Promise<string> {
  if (!SEARCH_URL) return ''
  try {
    const res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Agent-Name': AGENT_NAME },
      body: JSON.stringify({ query, max_results: 5 }),
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return ''
    const data = await res.json().catch(() => null) as
      | { answer?: string; results?: unknown[]; data?: unknown[] }
      | unknown[]
      | null
    if (!data) return ''
    const obj = Array.isArray(data) ? { results: data } : data
    const results: any[] = (obj.results ?? obj.data ?? []) as any[] // eslint-disable-line @typescript-eslint/no-explicit-any
    const lines: string[] = []
    if (!Array.isArray(data) && obj.answer) lines.push('Сводка: ' + obj.answer)
    for (const r of results.slice(0, 5)) {
      const title = r.title ?? r.name ?? ''
      const url = r.url ?? r.link ?? ''
      const snippet = r.content ?? r.snippet ?? r.description ?? ''
      lines.push(`• ${title} — ${snippet} (${url})`.trim())
    }
    return lines.join('\n').slice(0, 3000)
  } catch {
    return ''
  }
}
