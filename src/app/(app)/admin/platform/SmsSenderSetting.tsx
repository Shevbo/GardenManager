'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

const KEY = 'sms_sender_phone'
const PHONE_RE = /^\+7\d{10}$/

/** Настройка платформы: номер SIM СМС-гейта — показывается жителям в подсказке
 *  «сохраните контакт, чтобы коды не резал антиспам оператора». */
export function SmsSenderSetting() {
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/platform/settings').then(r => r.ok ? r.json() : null).then((d: { settings?: Record<string, string> } | null) => {
      if (d?.settings?.[KEY]) setValue(d.settings[KEY])
    }).catch(() => {})
  }, [])

  async function save() {
    const v = value.trim()
    if (v && !PHONE_RE.test(v)) { setError('Формат: +7XXXXXXXXXX (или пусто, чтобы скрыть номер из подсказки)'); return }
    setSaving(true); setError(''); setSaved(false)
    try {
      const r = await fetch('/api/admin/platform/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: KEY, value: v }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error ?? 'Ошибка'); return }
      setSaved(true)
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <h3 className="font-display font-bold text-ink text-base mb-1">Номер отправителя СМС</h3>
      <p className="text-ink/60 text-sm mb-3">
        Номер SIM-карты СМС-гейта. Показывается жителям в подсказке «сохраните контакт», чтобы коды не блокировал антиспам-фильтр оператора.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <input type="tel" placeholder="+79XXXXXXXXX" value={value}
          onChange={e => { setValue(e.target.value); setSaved(false) }}
          className="w-44 px-3 py-2 border border-border rounded-xl text-sm" />
        <Button type="button" variant="primary" size="sm" onClick={save} loading={saving}>Сохранить</Button>
        {saved && <span className="text-sm text-forest">Сохранено</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
