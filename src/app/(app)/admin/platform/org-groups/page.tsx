'use client'
import { useState, useEffect, useCallback } from 'react'
import { Trash2, Plus, X } from 'lucide-react'
import { useConfirm } from '@/components/ui/dialog'

interface OrgGroupOrg {
  org: { id: string; name: string }
}

interface OrgGroup {
  id: string
  name: string
  orgs: OrgGroupOrg[]
  _count: { petitions: number }
}

interface Organization {
  id: string
  name: string
  type: string
}

export default function PlatformOrgGroupsPage() {
  const confirm = useConfirm()
  const [groups, setGroups] = useState<OrgGroup[]>([])
  const [allOrgs, setAllOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [gRes, oRes] = await Promise.all([
      fetch('/api/org-groups'),
      fetch('/api/admin/platform/orgs'),
    ])
    if (gRes.ok) {
      const data = await gRes.json() as { groups: OrgGroup[] }
      setGroups(data.groups)
    }
    if (oRes.ok) {
      const data = await oRes.json() as { orgs: Organization[] }
      setAllOrgs(data.orgs)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/org-groups', {
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

  async function deleteGroup(id: string) {
    if (!(await confirm({ title: 'Удалить группу?', message: 'Заявления с этой группой потеряют таргетинг.', confirmLabel: 'Удалить', tone: 'danger' }))) return
    const res = await fetch(`/api/org-groups/${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  async function addOrg(groupId: string, organizationId: string) {
    await fetch(`/api/org-groups/${groupId}/orgs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    })
    load()
  }

  async function removeOrg(groupId: string, orgId: string) {
    await fetch(`/api/org-groups/${groupId}/orgs/${orgId}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Группы организаций</h1>
      <p className="text-ink/50 text-sm mb-6">Объединяйте несколько ЖК для совместных петиций</p>

      <form onSubmit={createGroup} className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Название группы (напр. Дома квартала Восточный)"
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
      ) : groups.length === 0 ? (
        <p className="text-ink/40 text-sm">Групп нет</p>
      ) : (
        <div className="space-y-4">
          {groups.map(g => {
            const memberOrgIds = new Set(g.orgs.map(o => o.org.id))
            const availableOrgs = allOrgs.filter(o => !memberOrgIds.has(o.id))
            return (
              <div key={g.id} className="p-4 bg-white border border-border rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-ink">{g.name}</p>
                    <p className="text-xs text-ink/40">{g._count.petitions} петиций</p>
                  </div>
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="p-2 rounded-lg text-ink/30 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {g.orgs.map(({ org }) => (
                    <span key={org.id} className="flex items-center gap-1 px-2.5 py-1 bg-cream border border-border rounded-lg text-xs text-ink">
                      {org.name}
                      <button onClick={() => removeOrg(g.id, org.id)} className="hover:text-red-600 transition-colors">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>

                {availableOrgs.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={e => { if (e.target.value) addOrg(g.id, e.target.value) }}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs text-ink/60 bg-white focus:outline-none focus:border-forest"
                  >
                    <option value="">+ Добавить ЖК в группу</option>
                    {availableOrgs.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
