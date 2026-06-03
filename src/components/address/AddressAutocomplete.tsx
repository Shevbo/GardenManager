'use client'
import { useState, useEffect, useRef } from 'react'

type Suggestion = {
  value: string
  data: { kladr_id?: string | null; fias_id?: string | null; fias_level?: string | null }
}

type Props = {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  id?: string
}

export function AddressAutocomplete({
  value, onChange, placeholder = 'Начните вводить адрес...',
  required, className = '', id,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function handleChange(v: string) {
    onChange(v)
    if (timer.current) clearTimeout(timer.current)
    if (v.trim().length < 3) {
      setSuggestions([])
      return
    }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch('/api/dadata/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: v }),
        })
        if (r.ok) {
          const data = await r.json() as { suggestions: Suggestion[]; notConfigured?: boolean }
          setSuggestions(data.suggestions)
          setNotConfigured(!!data.notConfigured)
          setOpen(true)
        }
      } finally { setLoading(false) }
    }, 250)
  }

  function pick(s: Suggestion) {
    onChange(s.value)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={className || 'w-full px-3 py-2 border border-border rounded-xl text-sm'}
      />
      {open && (suggestions.length > 0 || notConfigured) && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {notConfigured && (
            <div className="px-3 py-2 text-xs text-ink/50 border-b border-border bg-amber/5">
              Поиск по КЛАДР недоступен (нет DaData API ключа). Введите адрес вручную.
            </div>
          )}
          {suggestions.map((s, i) => {
            const fromKladr = !!(s.data?.kladr_id || s.data?.fias_id)
            return (
              <button key={i} type="button" onClick={() => pick(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-cream transition-colors border-b border-border last:border-0">
                <span className="flex items-start justify-between gap-2">
                  <span className="flex-1">{s.value}</span>
                  {fromKladr && (
                    <span className="shrink-0 text-[10px] font-medium tracking-wider uppercase text-forest/70 bg-forest/10 px-1.5 py-0.5 rounded">
                      КЛАДР
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40">…</div>
      )}
    </div>
  )
}
