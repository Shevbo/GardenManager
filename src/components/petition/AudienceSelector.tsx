'use client'
import { useState, useEffect } from 'react'

interface OrgGroup {
  id: string
  name: string
  orgs: { org: { id: string; name: string } }[]
}

interface Activity {
  id: string
  name: string
  _count: { memberships: number }
}

interface Props {
  orgGroupId: string
  activityId: string
  onOrgGroupChange: (id: string) => void
  onActivityChange: (id: string) => void
}

export function AudienceSelector({ orgGroupId, activityId, onOrgGroupChange, onActivityChange }: Props) {
  const [orgGroups, setOrgGroups] = useState<OrgGroup[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [mode, setMode] = useState<'default' | 'orgGroup' | 'activity'>(
    orgGroupId ? 'orgGroup' : activityId ? 'activity' : 'default'
  )

  useEffect(() => {
    Promise.all([
      fetch('/api/org-groups').then(r => r.json()),
      fetch('/api/activities').then(r => r.json()),
    ]).then(([gData, aData]: [{ groups?: OrgGroup[] }, { activities?: Activity[] }]) => {
      setOrgGroups(gData.groups ?? [])
      setActivities(aData.activities ?? [])
    }).catch(() => {})
  }, [])

  function handleModeChange(newMode: 'default' | 'orgGroup' | 'activity') {
    setMode(newMode)
    if (newMode !== 'orgGroup') onOrgGroupChange('')
    if (newMode !== 'activity') onActivityChange('')
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink">Аудитория</p>

      <div className="flex gap-2">
        {(['default', 'orgGroup', 'activity'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              mode === m
                ? 'bg-forest text-white border-forest'
                : 'bg-white text-ink/60 border-border hover:border-forest/40'
            }`}
          >
            {m === 'default' ? 'Все участники ЖК' : m === 'orgGroup' ? 'Группа ЖК' : 'Активность'}
          </button>
        ))}
      </div>

      {mode === 'orgGroup' && (
        <div>
          <label className="block text-xs text-ink/50 mb-1">Выбрать группу</label>
          <select
            value={orgGroupId}
            onChange={e => onOrgGroupChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white text-ink focus:outline-none focus:border-forest"
          >
            <option value="">— выберите группу —</option>
            {orgGroups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.orgs.length} ЖК)
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === 'activity' && (
        <div>
          <label className="block text-xs text-ink/50 mb-1">Выбрать активность</label>
          <select
            value={activityId}
            onChange={e => onActivityChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white text-ink focus:outline-none focus:border-forest"
          >
            <option value="">— выберите активность —</option>
            {activities.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} ({a._count.memberships} участников)
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
