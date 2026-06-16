'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Building2, Pencil, Trash2, Check, X } from 'lucide-react'
import { useConfirm } from '@/components/ui/dialog'

interface Org {
  id: string
  name: string
  type: 'zhk' | 'kooperativ'
  slug: string
  _count: { memberships: number; petitions: number; buildings: number }
}

const TYPE_LABEL: Record<Org['type'], string> = {
  zhk: 'ЖК',
  kooperativ: 'Кооператив',
}

export default function PlatformOrgsPage() {
  const confirm = useConfirm()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<Org['type']>('zhk')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<Org['type']>('zhk')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/platform/orgs')
    if (res.ok) {
      const data = await res.json() as { orgs: Org[] }
      setOrgs(data.orgs)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true); setError('')
    try {
      const res = await fetch('/api/admin/platform/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Не удалось создать')
      } else {
        setName(''); setType('zhk'); setShowForm(false)
        await load()
      }
    } finally { setCreating(false) }
  }

  function startEdit(o: Org, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setEditingId(o.id); setEditName(o.name); setEditType(o.type); setError('')
  }

  async function saveEdit(orgId: string) {
    setError('')
    const res = await fetch(`/api/admin/platform/orgs/${orgId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), type: editType }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Не удалось сохранить'); return
    }
    setEditingId(null); await load()
  }

  async function remove(orgId: string, orgName: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!(await confirm({ title: 'Удалить организацию?', message: `«${orgName}»\n\nУдаление возможно только при отсутствии зависимостей (зданий, участников, заявлений, собраний).`, confirmLabel: 'Удалить', tone: 'danger' }))) return
    setError('')
    const res = await fetch(`/api/admin/platform/orgs/${orgId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Не удалось удалить'); return
    }
    await load()
  }

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8 max-w-3xl overflow-y-auto flex-1">
      <a href="/admin/platform" className="text-sm text-forest hover:underline mb-4 inline-block">
        ← Управление справочниками
      </a>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink mb-1">Организации</h1>
          <p className="text-ink/50 text-sm">ЖК / кооперативы — все организации платформы</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-xl hover:bg-forest-light transition-colors text-sm font-medium">
            <Plus size={16} />
            Создать организацию
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={create} className="mb-6 bg-white border border-border rounded-2xl p-5 space-y-3">
          <h3 className="font-display font-bold text-base">Новая организация</h3>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Название (например, ЖК «Садовый»)" required
            className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
          <select value={type} onChange={e => setType(e.target.value as Org['type'])}
            className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-white">
            <option value="zhk">ЖК</option>
            <option value="kooperativ">Кооператив</option>
          </select>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={creating}
              className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {creating ? 'Создаём...' : 'Создать'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(''); setName('') }}
              className="px-4 py-2 border border-border rounded-xl text-sm">
              Отмена
            </button>
          </div>
        </form>
      )}

      {error && !showForm && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>
      )}

      {orgs.length === 0 ? (
        <div className="text-center py-12 text-ink/50">
          <Building2 size={32} className="mx-auto mb-3 opacity-50" />
          <p>Организаций ещё нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map(org => {
            if (editingId === org.id) {
              return (
                <div key={org.id} className="bg-white border-2 border-forest rounded-2xl p-4 space-y-2">
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
                  <select value={editType} onChange={e => setEditType(e.target.value as Org['type'])}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-white">
                    <option value="zhk">ЖК</option>
                    <option value="kooperativ">Кооператив</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(org.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-medium">
                      <Check size={14} /> Сохранить
                    </button>
                    <button onClick={() => { setEditingId(null); setError('') }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs">
                      <X size={14} /> Отмена
                    </button>
                  </div>
                </div>
              )
            }
            return (
              <div key={org.id} className="bg-white border border-border rounded-2xl flex items-stretch overflow-hidden hover:border-forest transition-colors">
                <a href={`/admin/platform/orgs/${org.id}`}
                  className="flex-1 p-4 flex items-center gap-4 cursor-pointer hover:bg-forest/5">
                  <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{org.name}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {TYPE_LABEL[org.type]} · {org._count.memberships} участн. · {org._count.buildings} объект. · {org._count.petitions} заявл.
                    </p>
                  </div>
                  <code className="text-xs text-ink/40 font-mono shrink-0">{org.slug}</code>
                </a>
                <div className="flex flex-col border-l border-border">
                  <button onClick={(e) => startEdit(org, e)} title="Переименовать"
                    className="flex-1 px-3 text-ink/40 hover:text-forest hover:bg-forest/5 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={(e) => remove(org.id, org.name, e)} title="Удалить"
                    className="flex-1 px-3 text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors border-t border-border">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
