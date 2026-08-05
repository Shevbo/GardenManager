'use client'
import { useState } from 'react'
import { NOTIFY_EVENTS, NOTIFY_EVENT_LABELS, type NotifyPrefs } from '@/lib/notify-labels'

export function NotifyPrefsForm({ initial }: { initial: NotifyPrefs }) {
  const [prefs, setPrefs] = useState<NotifyPrefs>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function toggle(event: (typeof NOTIFY_EVENTS)[number], channel: 'inApp' | 'email') {
    setSaved(false)
    setPrefs(p => ({ ...p, [event]: { ...p[event], [channel]: !p[event][channel] } }))
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const r = await fetch('/api/me/notify-prefs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefs }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Не удалось сохранить'); return }
      setSaved(true)
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <p className="text-sm text-ink/60 mb-4">Выберите, о чём и как вас уведомлять.</p>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-3 items-center">
        <span className="text-xs uppercase tracking-wide text-ink/40">Событие</span>
        <span className="text-xs uppercase tracking-wide text-ink/40 text-center">В приложении</span>
        <span className="text-xs uppercase tracking-wide text-ink/40 text-center">Email</span>
        {NOTIFY_EVENTS.map(ev => (
          <div key={ev} className="contents">
            <span className="text-sm text-ink">{NOTIFY_EVENT_LABELS[ev]}</span>
            <label className="flex justify-center cursor-pointer">
              <input type="checkbox" checked={prefs[ev].inApp} onChange={() => toggle(ev, 'inApp')} className="w-4 h-4 accent-[#0A3D2E]" />
            </label>
            <label className="flex justify-center cursor-pointer">
              <input type="checkbox" checked={prefs[ev].email} onChange={() => toggle(ev, 'email')} className="w-4 h-4 accent-[#0A3D2E]" />
            </label>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-5">
        <button onClick={save} disabled={saving}
          className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
          {saving ? 'Сохраняю...' : 'Сохранить'}
        </button>
        {saved && <span className="text-sm text-[#1A6B3A]">Сохранено ✓</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
