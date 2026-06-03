'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Building2 } from 'lucide-react'

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
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<Org['type']>('zhk')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

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

  if (loading) {
    return <div className="p-8">Загрузка...</div>
  }

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

      {orgs.length === 0 ? (
        <div className="text-center py-12 text-ink/50">
          <Building2 size={32} className="mx-auto mb-3 opacity-50" />
          <p>Организаций ещё нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map(org => (
            <a key={org.id} href={`/admin/platform/orgs/${org.id}`}
              className="bg-white border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-forest hover:bg-forest/5 transition-colors cursor-pointer">
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
          ))}
        </div>
      )}
    </div>
  )
}
