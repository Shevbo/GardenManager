'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { BadgeCheck, AlertTriangle } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Платформа', coalition_admin: 'Коалиция',
  org_admin: 'Администратор', council_member: 'Совет',
  owner: 'Собственник', tenant: 'Арендатор',
}

type Member = {
  id: string; role: string; isOwner: boolean; areaSqm: number | null
  verifiedAt: string | null; activitiesCount: number; lastDeclarationAt: string | null
  blockReason: 'no_apartment' | 'no_declaration' | null
  user: { id: string; name: string | null; email: string | null; phone: string | null; phoneVerified: boolean }
  apartment: { number: string; floor: number | null; entrance: number | null; areaSqm: number | null; building: { address: string } } | null
  org: { id: string; name: string; type: string; orgGroups: Array<{ id: string; name: string }> }
}

export default function PlatformMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOrgId, setFilterOrgId] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterVerified, setFilterVerified] = useState('')

  useEffect(() => {
    fetch('/api/admin/platform/members')
      .then(r => r.json())
      .then(d => { setMembers(d.members ?? []); setLoading(false) })
  }, [])

  const orgs = useMemo(() => {
    const map = new Map<string, string>()
    members.forEach(m => map.set(m.org.id, m.org.name))
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [members])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter(m => {
      if (q && !( (m.user.name ?? '').toLowerCase().includes(q) ||
                  (m.user.email ?? '').toLowerCase().includes(q) ||
                  (m.user.phone ?? '').toLowerCase().includes(q) )) return false
      if (filterOrgId && m.org.id !== filterOrgId) return false
      if (filterRole && m.role !== filterRole) return false
      if (filterVerified === 'phone' && !m.user.phoneVerified) return false
      if (filterVerified === 'pep' && !m.lastDeclarationAt) return false
      if (filterVerified === 'unverified' && (m.user.phoneVerified || m.lastDeclarationAt)) return false
      return true
    })
  }, [members, search, filterOrgId, filterRole, filterVerified])

  if (loading) return <div className="p-8 text-ink/40">Загрузка...</div>

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 max-w-screen-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin/platform" className="text-sm text-ink/40 hover:text-forest">← Управление</Link>
            <h1 className="font-display text-2xl font-bold text-ink mt-1">Участники</h1>
            <p className="text-ink/50 text-sm">{filtered.length} из {members.length}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, email, телефону..."
            className="px-3 py-2 border border-border rounded-xl text-sm w-72 focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
          <select value={filterOrgId} onChange={e => setFilterOrgId(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl text-sm bg-white">
            <option value="">Все организации</option>
            {orgs.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl text-sm bg-white">
            <option value="">Все роли</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterVerified} onChange={e => setFilterVerified(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl text-sm bg-white">
            <option value="">Любой статус</option>
            <option value="phone">Тел. подтверждён</option>
            <option value="pep">Есть ПЭП</option>
            <option value="unverified">Не верифицирован</option>
          </select>
        </div>

        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-border">
                <tr>
                  {['Участник','Телефон','Роль','ПЭП','Площадь','Квартира / Здание','Организация / Группа','Акт.','⚠'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-ink/50 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-cream/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest text-xs font-bold shrink-0">
                          {(m.user.name ?? m.user.email ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate max-w-[160px]">{m.user.name ?? '—'}</p>
                          <p className="text-ink/50 text-xs truncate max-w-[160px]">{m.user.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-ink/70">{m.user.phone ?? '—'}</span>
                      {m.user.phoneVerified && <BadgeCheck size={13} className="inline ml-1 text-forest" />}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs bg-ink/5 text-ink/70 px-2 py-0.5 rounded">{ROLE_LABELS[m.role] ?? m.role}</span>
                      {m.isOwner && <span className="ml-1 text-xs bg-forest/10 text-forest px-2 py-0.5 rounded">Собственник</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-ink/60">
                      {m.lastDeclarationAt ? new Date(m.lastDeclarationAt).toLocaleDateString('ru-RU') : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-ink/70">
                      {m.areaSqm ? `${m.areaSqm} м²` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {m.apartment ? (
                        <div>
                          <p className="text-ink text-xs font-medium">кв. {m.apartment.number}{m.apartment.floor ? `, эт. ${m.apartment.floor}` : ''}{m.apartment.entrance ? `, подъезд ${m.apartment.entrance}` : ''}</p>
                          <p className="text-ink/50 text-xs truncate max-w-[180px]">{m.apartment.building.address}</p>
                        </div>
                      ) : (
                        <span className="text-ink/30 text-xs italic">Не указано</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink text-xs font-medium truncate max-w-[150px]">{m.org.name}</p>
                      {m.org.orgGroups.length > 0 && (
                        <p className="text-ink/50 text-xs truncate max-w-[150px]">{m.org.orgGroups.map(g => g.name).join(', ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-ink/60">
                      {m.activitiesCount > 0 ? m.activitiesCount : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {m.blockReason && (
                        <span title={m.blockReason === 'no_apartment' ? 'Нет квартиры — не сможет голосовать' : 'Нет ПЭП — не сможет голосовать'}
                          className="inline-flex items-center gap-1 text-xs bg-amber/10 text-amber-700 px-2 py-0.5 rounded">
                          <AlertTriangle size={11} />
                          {m.blockReason === 'no_apartment' ? 'Нет кв.' : 'Нет ПЭП'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-ink/40">Участников не найдено</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
