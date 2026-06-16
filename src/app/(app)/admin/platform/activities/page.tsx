'use client'
import { useState, useEffect, useCallback } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useConfirm } from '@/components/ui/dialog'

interface Activity {
  id: string
  name: string
  _count: { memberships: number }
}

export default function PlatformActivitiesPage() {
  const confirm = useConfirm()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/activities')
    if (res.ok) {
      const data = await res.json() as { activities: Activity[] }
      setActivities(data.activities)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (res.ok) { setNewName(''); load() }
      else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Ошибка')
      }
    } finally { setCreating(false) }
  }

  async function remove(id: string) {
    if (!(await confirm({ title: 'Удалить активность?', message: 'Все участники потеряют членство.', confirmLabel: 'Удалить', tone: 'danger' }))) return
    const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Активности</h1>
      <p className="text-ink/50 text-sm mb-6">Глобальные группы интересов для таргетинга петиций</p>

      <form onSubmit={create} className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Название активности (напр. Автомобилист)"
          className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:border-forest"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest text-white text-sm font-medium hover:bg-forest/90 transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
          Создать
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-ink/40 text-sm">Загрузка...</p>
      ) : activities.length === 0 ? (
        <p className="text-ink/40 text-sm">Активностей нет</p>
      ) : (
        <div className="space-y-2">
          {activities.map(a => (
            <div key={a.id} className="flex items-center justify-between p-4 bg-white border border-border rounded-2xl">
              <div>
                <p className="text-sm font-medium text-ink">{a.name}</p>
                <p className="text-xs text-ink/40">{a._count.memberships} участников</p>
              </div>
              <button
                onClick={() => remove(a.id)}
                className="p-2 rounded-lg text-ink/30 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
