/**
 * Скользящее окно в памяти процесса. Приложение крутится одним инстансом pm2,
 * поэтому общего стора (redis) не нужно; при переезде на несколько инстансов
 * лимит станет «на инстанс» — это осознанный компромисс, а не забытая деталь.
 *
 * Нужен там, где публичный (безсессионный) роут тратит внешнюю квоту —
 * например, прокси подсказок DaData в мастере регистрации.
 */
export type RateLimitVerdict = { allowed: boolean; retryAfterSec: number }

export type RateLimiter = ((key: string, now?: number) => RateLimitVerdict) & { size: () => number }

export function createRateLimiter(limit: number, windowMs: number, gcThreshold = 5000): RateLimiter {
  const hits = new Map<string, number[]>()

  const take = (key: string, now: number = Date.now()): RateLimitVerdict => {
    const from = now - windowMs
    const recent = (hits.get(key) ?? []).filter(t => t > from)

    if (hits.size >= gcThreshold) {
      for (const [k, times] of hits) {
        if (times.every(t => t <= from)) hits.delete(k)
      }
    }

    if (recent.length >= limit) {
      hits.set(key, recent)
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) }
    }

    recent.push(now)
    hits.set(key, recent)
    return { allowed: true, retryAfterSec: 0 }
  }

  take.size = () => hits.size
  return take
}

/** Клиентский IP из цепочки прокси (smain nginx → hoster nginx → app). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip')?.trim() || 'unknown'
}
