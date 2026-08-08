'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'

/** Живые интерим-итоги + таймер комнаты собрания (статус VOTING). */

export type LiveQuestion = { questionId: string; for: number; against: number; abstain: number; voted: number }
export type LiveData = {
  serverNow: string
  endsAt: string
  status: string
  votedCount: number
  totalEligible: number
  questions: LiveQuestion[]
}

const POLL_MS = 7000

/** Поллит /live каждые 7с + при возврате фокуса. skew — поправка часов клиента. */
export function useAssemblyLive(assemblyId: string, enabled: boolean) {
  const [data, setData] = useState<LiveData | null>(null)
  const skewRef = useRef(0)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/assemblies/${assemblyId}/live`, { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json() as LiveData
      skewRef.current = new Date(d.serverNow).getTime() - Date.now()
      setData(d)
    } catch { /* сеть мигнула — следующий тик догонит */ }
  }, [assemblyId])

  useEffect(() => {
    if (!enabled) return
    void load()
    const t = setInterval(load, POLL_MS)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [enabled, load])

  return { data, refresh: load, skewRef }
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function formatLeft(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const days = Math.floor(s / 86400)
  const hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60
  return days > 0 ? `${days} дн. ${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(hh)}:${pad(mm)}:${pad(ss)}`
}

/**
 * Баннер с обратным отсчётом и правилом автовоздержания — ставится в шапке
 * И внизу формы (требование Бориса). После дедлайна меняет текст.
 */
export function VotingCountdown({ endsAt, skewMs, onExpire }: {
  endsAt: string
  skewMs: number
  onExpire?: () => void
}) {
  const [left, setLeft] = useState(() => new Date(endsAt).getTime() - (Date.now() + skewMs))
  const expiredRef = useRef(false)

  useEffect(() => {
    const tick = () => {
      const l = new Date(endsAt).getTime() - (Date.now() + skewMs)
      setLeft(l)
      if (l <= 0 && !expiredRef.current) { expiredRef.current = true; onExpire?.() }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [endsAt, skewMs, onExpire])

  const expired = left <= 0
  return (
    <div className={`rounded-2xl border p-3.5 flex items-start gap-3 ${
      expired ? 'bg-blue-50 border-blue-200' : 'bg-amber/5 border-amber/30'
    }`}>
      <Clock size={18} className={`shrink-0 mt-0.5 ${expired ? 'text-blue-700' : 'text-amber-700'}`} />
      {expired ? (
        <p className="text-sm text-blue-800">
          Голосование завершено, идёт подведение итогов. Не отправившие бюллетень считаются не участвовавшими в собрании.
        </p>
      ) : (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink tabular-nums">
            До окончания голосования: {formatLeft(left)}
          </p>
          <p className="text-xs text-ink/60 mt-1">
            Вопросы без ответа в отправленном бюллетене будут засчитаны как «воздержался».
            Кто не отправит бюллетень до окончания — считается не участвовавшим в собрании.
          </p>
        </div>
      )}
    </div>
  )
}

const BAR = [
  { key: 'for' as const, label: 'За', bar: 'bg-forest', text: 'text-forest' },
  { key: 'against' as const, label: 'Против', bar: 'bg-red-500', text: 'text-red-600' },
  { key: 'abstain' as const, label: 'Воздерж.', bar: 'bg-gray-400', text: 'text-gray-500' },
]

/** Живые счётчики по вариантам ответа одного вопроса (доли — от проголосовавших). */
export function LiveCounters({ q, totalEligible }: { q: LiveQuestion; totalEligible: number }) {
  return (
    <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
      {BAR.map(({ key, label, bar, text }) => {
        const n = q[key]
        const pct = q.voted > 0 ? (n / q.voted) * 100 : 0
        return (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-ink/60">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-ink/5 overflow-hidden">
              <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`w-8 shrink-0 text-right font-semibold tabular-nums ${text}`}>{n}</span>
          </div>
        )
      })}
      <p className="text-[11px] text-ink/45 pt-0.5">
        Проголосовало {q.voted} из {totalEligible} собственников
      </p>
    </div>
  )
}
