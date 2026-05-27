'use client'
import { useState, useEffect, useCallback } from 'react'
import { ConsentModal } from '@/components/activity/ConsentModal'
import { CheckSquare, LogOut } from 'lucide-react'

interface Activity {
  id: string
  name: string
  orgId: string | null
  createdAt: string
  _count: { memberships: number }
  memberships: { id: string }[]
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
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

  async function join(activityId: string) {
    const res = await fetch(`/api/activities/${activityId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true }),
    })
    if (res.ok) {
      setJoiningId(null)
      load()
    } else {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Ошибка')
    }
  }

  async function leave(activityId: string) {
    const res = await fetch(`/api/activities/${activityId}/leave`, { method: 'DELETE' })
    if (res.ok) load()
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-ink/40 text-sm">Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl overflow-y-auto flex-1">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Активности</h1>
      <p className="text-ink/50 text-sm mb-6">
        Вступайте в группы, чтобы участвовать в заявлениях для них
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {activities.length === 0 && (
        <p className="text-ink/40 text-sm">Активностей пока нет</p>
      )}

      <div className="space-y-3">
        {activities.map(activity => {
          const isMember = activity.memberships.length > 0
          return (
            <div
              key={activity.id}
              className="flex items-center justify-between p-4 bg-white border border-border rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isMember ? 'bg-forest/10' : 'bg-cream'}`}>
                  <CheckSquare size={17} className={isMember ? 'text-forest' : 'text-ink/30'} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{activity.name}</p>
                  <p className="text-xs text-ink/40">{activity._count.memberships} участников</p>
                </div>
              </div>
              {isMember ? (
                <button
                  onClick={() => leave(activity.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-ink/50 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={13} />
                  Выйти
                </button>
              ) : (
                <button
                  onClick={() => setJoiningId(activity.id)}
                  className="px-3 py-1.5 rounded-lg bg-forest text-white text-xs font-medium hover:bg-forest/90 transition-colors"
                >
                  Вступить
                </button>
              )}
            </div>
          )
        })}
      </div>

      {joiningId && (
        <ConsentModal
          activityName={activities.find(a => a.id === joiningId)?.name ?? ''}
          onConfirm={() => join(joiningId)}
          onCancel={() => setJoiningId(null)}
        />
      )}
    </div>
  )
}
