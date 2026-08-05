'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Check, X, Pencil, Eye, EyeOff } from 'lucide-react'
import { useConfirm } from '@/components/ui/dialog'

type OrgType = { code: string; label: string; sortOrder: number; active: boolean; usage: number }

export default function OrgTypesPage() {
  const confirm = useConfirm()
  const [types, setTypes] = useState<OrgType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newCode, setNewCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [editCode, setEditCode] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/platform/org-types')
    if (r.ok) { const d = await r.json() as { types: OrgType[] }; setTypes(d.types) }
    else setError('Нет доступа')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel.trim() || creating) return
    setCreating(true); setError('')
    try {
      const r = await fetch('/api/admin/platform/org-types', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), code: newCode.trim() || undefined }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Не удалось'); return }
      setNewLabel(''); setNewCode(''); await load()
    } finally { setCreating(false) }
  }

  async function patch(code: string, body: Record<string, unknown>) {
    setError('')
    const r = await fetch('/api/admin/platform/org-types', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, ...body }),
    })
    if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Не удалось'); return }
    await load()
  }

  async function remove(t: OrgType) {
    if (!(await confirm({ title: 'Удалить тип?', message: `«${t.label}» (${t.code})`, confirmLabel: 'Удалить', tone: 'danger' }))) return
    setError('')
    const r = await fetch('/api/admin/platform/org-types', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: t.code }),
    })
    if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Не удалось'); return }
    await load()
  }

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8 max-w-2xl overflow-y-auto flex-1">
      <Link href="/admin/platform" className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink mb-4">
        <ArrowLeft size={15} /> Управление
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Типы организаций</h1>
      <p className="text-ink/50 text-sm mb-6">Справочник видов организаций (ЖК, ГК, ТСЖ и т.д.). Используемый тип нельзя удалить — деактивируйте.</p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}

      <form onSubmit={create} className="mb-6 bg-white border border-border rounded-2xl p-4 flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-ink/50 mb-1">Название</label>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="напр. ТСЖ"
            className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
        </div>
        <div className="w-32">
          <label className="block text-xs text-ink/50 mb-1">Код (лат.)</label>
          <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="авто"
            className="w-full px-3 py-2 border border-border rounded-xl text-sm font-mono" />
        </div>
        <button type="submit" disabled={creating}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
          <Plus size={15} /> Добавить
        </button>
      </form>

      <div className="space-y-2">
        {types.map(t => (
          <div key={t.code} className={`bg-white border border-border rounded-2xl p-4 flex items-center gap-3 ${t.active ? '' : 'opacity-60'}`}>
            <div className="flex-1 min-w-0">
              {editCode === t.code ? (
                <div className="flex items-center gap-2">
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                    className="flex-1 px-2 py-1 border border-border rounded-lg text-sm" />
                  <button onClick={() => { patch(t.code, { label: editLabel }); setEditCode(null) }} className="text-forest"><Check size={16} /></button>
                  <button onClick={() => setEditCode(null)} className="text-ink/40"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <p className="font-medium text-ink">{t.label} {!t.active && <span className="text-xs text-ink/40">(скрыт)</span>}</p>
                  <p className="text-xs text-ink/40 font-mono">{t.code} · используют: {t.usage}</p>
                </>
              )}
            </div>
            {editCode !== t.code && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditCode(t.code); setEditLabel(t.label) }} title="Переименовать" className="p-2 text-ink/40 hover:text-forest"><Pencil size={15} /></button>
                <button onClick={() => patch(t.code, { active: !t.active })} title={t.active ? 'Скрыть' : 'Показать'} className="p-2 text-ink/40 hover:text-forest">
                  {t.active ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button onClick={() => remove(t)} disabled={t.usage > 0} title={t.usage > 0 ? 'Используется' : 'Удалить'}
                  className="p-2 text-ink/40 hover:text-red-500 disabled:opacity-30 disabled:hover:text-ink/40"><Trash2 size={15} /></button>
              </div>
            )}
          </div>
        ))}
        {types.length === 0 && <p className="text-ink/50 text-center py-8">Типов пока нет.</p>}
      </div>
    </div>
  )
}
