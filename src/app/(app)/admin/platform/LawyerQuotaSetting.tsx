'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

const KEY = 'lawyer_quota_per_document'

export function LawyerQuotaSetting() {
  const [value, setValue] = useState('5')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/platform/settings').then(r => r.ok ? r.json() : null).then((d: { settings?: Record<string, string> } | null) => {
      if (d?.settings?.[KEY]) setValue(d.settings[KEY])
    }).catch(() => {})
  }, [])

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const r = await fetch('/api/admin/platform/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: KEY, value: String(parseInt(value, 10) || 5) }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error ?? 'Ошибка'); return }
      setSaved(true)
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <h3 className="font-display font-bold text-ink text-base mb-1">Лимит вопросов юристу ИИ</h3>
      <p className="text-ink/60 text-sm mb-3">Сколько вопросов юристу ИИ может задать не-администратор на один документ. Администраторы — без лимита.</p>
      <div className="flex items-center gap-3">
        <input type="number" min="0" value={value} onChange={e => { setValue(e.target.value); setSaved(false) }}
          className="w-24 px-3 py-2 border border-border rounded-xl text-sm" />
        <Button type="button" variant="primary" size="sm" onClick={save} loading={saving}>Сохранить</Button>
        {saved && <span className="text-sm text-forest">Сохранено</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
