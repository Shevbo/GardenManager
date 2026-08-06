'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Building2, Users, Tag } from 'lucide-react'

type Org = { orgId: string; name: string; typeLabel: string }
type Named = { id: string; name: string }

/** Short badge text from a type label (e.g. «Кооператив» → «КОО», «ГК» → «ГК»). */
function typeBadge(label: string | undefined): string {
  if (!label) return '—'
  return label.length <= 3 ? label : label.slice(0, 3).toUpperCase()
}

export function OrgSelector() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [groups, setGroups] = useState<Named[]>([])
  const [activities, setActivities] = useState<Named[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/me/nav')
      .then(r => r.ok ? r.json() : null)
      .then((d: { activeOrgId?: string | null; orgs?: Org[]; groups?: Named[]; activities?: Named[] } | null) => {
        if (!d) return
        setOrgs(d.orgs ?? [])
        setGroups(d.groups ?? [])
        setActivities(d.activities ?? [])
        setActiveOrgId(d.activeOrgId ?? null)
      })
      .catch(() => {})
  }, [])

  async function pickOrg(orgId: string | null) {
    setOpen(false)
    setActiveOrgId(orgId)
    await fetch('/api/me/active-org', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    })
    router.refresh()
  }

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  const isEmpty = orgs.length === 0 && groups.length === 0 && activities.length === 0
  if (isEmpty) {
    return (
      <div className="px-3 py-3 border-b border-white/10">
        <div className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left opacity-60">
          <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white/40 text-xs font-bold">—</span>
          </div>
          <p className="text-white/40 text-xs">Не привязан к организации</p>
        </div>
      </div>
    )
  }

  const active = activeOrgId ? orgs.find(o => o.orgId === activeOrgId) : null
  const label = active?.name ?? (orgs.length > 0 ? 'Все организации' : 'Навигация')
  const subLabel = active
    ? active.typeLabel
    : `${orgs.length} орг.${groups.length ? ` · ${groups.length} гр.` : ''}${activities.length ? ` · ${activities.length} акт.` : ''}`

  return (
    <div className="relative px-3 py-3 border-b border-white/10">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 transition-colors text-left">
        <div className="w-7 h-7 bg-amber/20 rounded-lg flex items-center justify-center shrink-0">
          {active
            ? <span className="text-amber text-[10px] font-bold">{typeBadge(active.typeLabel)}</span>
            : <Building2 size={14} className="text-amber" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">{label}</p>
          <p className="text-white/40 text-[10px] truncate">{subLabel}</p>
        </div>
        <ChevronDown size={14} className={`text-white/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-30 bg-forest border border-white/10 rounded-xl shadow-lg max-h-96 overflow-y-auto py-1">
          {/* Организации */}
          {orgs.length > 0 && (
            <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-wider text-white/40 font-bold">Организации</p>
          )}
          {orgs.length > 1 && (
            <button onClick={() => pickOrg(null)}
              className={`w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2 ${!activeOrgId ? 'bg-white/15' : ''}`}>
              <Building2 size={13} className="text-white/50 shrink-0" />
              <span className="font-medium">Все организации</span>
            </button>
          )}
          {orgs.map(o => (
            <button key={o.orgId} onClick={() => pickOrg(o.orgId)}
              className={`w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2 ${activeOrgId === o.orgId ? 'bg-white/15' : ''}`}>
              <Building2 size={13} className="text-amber shrink-0" />
              <span className="font-medium truncate flex-1">{o.name}</span>
              <span className="text-white/40 text-[10px] shrink-0">{o.typeLabel}</span>
            </button>
          ))}

          {/* Группы */}
          {groups.length > 0 && (
            <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-wider text-white/40 font-bold border-t border-white/5 mt-1">Группы</p>
          )}
          {groups.map(g => (
            <button key={g.id} onClick={() => go('/admin/platform/org-groups')}
              className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2">
              <Users size={13} className="text-white/50 shrink-0" />
              <span className="truncate">{g.name}</span>
            </button>
          ))}

          {/* Активности */}
          {activities.length > 0 && (
            <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-wider text-white/40 font-bold border-t border-white/5 mt-1">Активности</p>
          )}
          {activities.map(a => (
            <button key={a.id} onClick={() => go('/activities')}
              className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 flex items-center gap-2">
              <Tag size={13} className="text-white/50 shrink-0" />
              <span className="truncate">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
