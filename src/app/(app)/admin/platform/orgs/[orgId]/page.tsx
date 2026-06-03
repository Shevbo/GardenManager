'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Building2, Home, Plus, Trash2, ChevronDown, ChevronRight, User, BadgeCheck, Pencil, Check, X } from 'lucide-react'

type Member = {
  id: string; role: string; isOwner: boolean; areaSqm: number | null; verifiedAt: string | null
  user: { id: string; email: string | null; name: string | null; phone: string | null; phoneVerified: string | null }
}
type Apartment = {
  id: string; number: string; floor: number | null; entrance: number | null; areaSqm: number | null
  memberships: Member[]
}
type Building = {
  id: string; address: string; addressNormalized: string | null; createdAt: string
  apartments: Apartment[]
}
type OrgTree = {
  id: string; name: string; type: string; slug: string
  buildings: Building[]
  memberships: Array<{ id: string; role: string; isOwner: boolean; user: { id: string; email: string | null; name: string | null } }>
}

export default function OrgTreePage() {
  const params = useParams<{ orgId: string }>()
  const orgId = params.orgId
  const [org, setOrg] = useState<OrgTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [openBuildings, setOpenBuildings] = useState<Set<string>>(new Set())
  const [openApartments, setOpenApartments] = useState<Set<string>>(new Set())
  const [addingBuilding, setAddingBuilding] = useState(false)
  const [newBuildingAddress, setNewBuildingAddress] = useState('')
  const [addingApt, setAddingApt] = useState<string | null>(null)
  const [newAptNumber, setNewAptNumber] = useState('')
  const [editingBldId, setEditingBldId] = useState<string | null>(null)
  const [editBldAddr, setEditBldAddr] = useState('')
  const [editingAptId, setEditingAptId] = useState<string | null>(null)
  const [editApt, setEditApt] = useState<{ number: string; floor: string; entrance: string; areaSqm: string }>({ number: '', floor: '', entrance: '', areaSqm: '' })
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/platform/orgs/${orgId}/tree`)
    if (res.ok) {
      const data = await res.json() as { org: OrgTree }
      setOrg(data.org)
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id); else next.add(id)
    setter(next)
  }

  async function createBuilding(e: React.FormEvent) {
    e.preventDefault()
    if (!newBuildingAddress.trim()) return
    setError('')
    const res = await fetch(`/api/admin/platform/orgs/${orgId}/buildings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: newBuildingAddress.trim() }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Не удалось создать'); return
    }
    setNewBuildingAddress(''); setAddingBuilding(false)
    await load()
  }

  async function saveBuilding(id: string) {
    if (!editBldAddr.trim()) return
    setError('')
    const res = await fetch(`/api/admin/platform/buildings/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: editBldAddr.trim() }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Не удалось сохранить'); return
    }
    setEditingBldId(null); await load()
  }

  async function deleteBuilding(buildingId: string, address: string) {
    if (!confirm(`Удалить здание "${address}"?`)) return
    setError('')
    const res = await fetch(`/api/admin/platform/buildings/${buildingId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Не удалось удалить'); return
    }
    await load()
  }

  async function createApartment(e: React.FormEvent, buildingId: string) {
    e.preventDefault()
    if (!newAptNumber.trim()) return
    setError('')
    const res = await fetch(`/api/admin/platform/buildings/${buildingId}/apartments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: newAptNumber.trim() }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Не удалось создать'); return
    }
    setNewAptNumber(''); setAddingApt(null)
    await load()
  }

  async function saveApartment(id: string) {
    setError('')
    const body: { number?: string; floor?: number | null; entrance?: number | null; areaSqm?: number | null } = {}
    if (editApt.number.trim()) body.number = editApt.number.trim()
    body.floor = editApt.floor.trim() ? Number(editApt.floor) : null
    body.entrance = editApt.entrance.trim() ? Number(editApt.entrance) : null
    body.areaSqm = editApt.areaSqm.trim() ? Number(editApt.areaSqm) : null
    const res = await fetch(`/api/admin/platform/apartments/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Не удалось сохранить'); return
    }
    setEditingAptId(null); await load()
  }

  async function deleteApartment(apartmentId: string, number: string) {
    if (!confirm(`Удалить квартиру №${number}?`)) return
    setError('')
    const res = await fetch(`/api/admin/platform/apartments/${apartmentId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Не удалось удалить'); return
    }
    await load()
  }

  if (loading) return <div className="p-8">Загрузка...</div>
  if (!org) return <div className="p-8 text-red-500">Организация не найдена</div>

  const totalApartments = org.buildings.reduce((s, b) => s + b.apartments.length, 0)
  const totalMembers = org.buildings.reduce(
    (s, b) => s + b.apartments.reduce((s2, a) => s2 + a.memberships.length, 0), 0,
  ) + org.memberships.length

  return (
    <div className="p-8 max-w-4xl overflow-y-auto flex-1">
      <a href="/admin/platform/orgs" className="text-sm text-forest hover:underline mb-4 inline-block">
        ← Все организации
      </a>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink mb-1">{org.name}</h1>
        <p className="text-ink/50 text-sm">
          {org.type === 'zhk' ? 'ЖК' : 'Кооператив'} · slug <code className="text-xs">{org.slug}</code> · {org.buildings.length} здан. · {totalApartments} кв. · {totalMembers} участн.
        </p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}

      {/* Unassigned memberships (org-level, no apartment) */}
      {org.memberships.length > 0 && (
        <div className="mb-6 bg-amber/5 border border-amber/30 rounded-2xl p-4">
          <p className="text-xs font-medium text-amber tracking-wider uppercase mb-2">
            Без квартиры — {org.memberships.length}
          </p>
          <ul className="space-y-1.5">
            {org.memberships.map(m => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <User size={14} className="text-ink/40" />
                <span>{m.user.name ?? m.user.email}</span>
                <span className="text-xs text-ink/40">· {m.role}{m.isOwner && ' · собственник'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Buildings tree */}
      <div className="space-y-2">
        {org.buildings.map(b => {
          const open = openBuildings.has(b.id)
          const memberCount = b.apartments.reduce((s, a) => s + a.memberships.length, 0)
          const isEditing = editingBldId === b.id
          return (
            <div key={b.id} className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => toggle(openBuildings, setOpenBuildings, b.id)}
                  className="shrink-0 p-1 hover:bg-cream rounded">
                  {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <Building2 size={18} className="text-amber shrink-0" />
                {isEditing ? (
                  <>
                    <input type="text" value={editBldAddr} onChange={e => setEditBldAddr(e.target.value)} autoFocus
                      className="flex-1 px-3 py-1.5 border border-forest rounded-xl text-sm" />
                    <button onClick={() => saveBuilding(b.id)} title="Сохранить"
                      className="shrink-0 p-1.5 text-forest hover:bg-forest/10 rounded">
                      <Check size={15} />
                    </button>
                    <button onClick={() => setEditingBldId(null)} title="Отмена"
                      className="shrink-0 p-1.5 text-ink/40 hover:bg-cream rounded">
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink truncate">{b.address}</p>
                      <p className="text-xs text-ink/50">{b.apartments.length} кв. · {memberCount} участн.</p>
                    </div>
                    <button onClick={() => { setEditingBldId(b.id); setEditBldAddr(b.address); setError('') }} title="Изменить"
                      className="shrink-0 p-1.5 text-ink/40 hover:text-forest hover:bg-forest/5 rounded">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => deleteBuilding(b.id, b.address)} title="Удалить"
                      className="shrink-0 p-1.5 text-ink/40 hover:text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>

              {open && (
                <div className="border-t border-border bg-cream/40 px-4 py-3 space-y-2">
                  {b.apartments.map(a => {
                    const aOpen = openApartments.has(a.id)
                    const aEditing = editingAptId === a.id
                    return (
                      <div key={a.id} className="bg-white border border-border rounded-xl">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <button onClick={() => toggle(openApartments, setOpenApartments, a.id)}
                            className="shrink-0 p-0.5 hover:bg-cream rounded">
                            {aOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <Home size={14} className="text-forest shrink-0" />
                          {aEditing ? (
                            <>
                              <input type="text" value={editApt.number} onChange={e => setEditApt({...editApt, number: e.target.value})}
                                placeholder="№" className="w-16 px-2 py-1 border border-forest rounded text-sm" />
                              <input type="number" value={editApt.floor} onChange={e => setEditApt({...editApt, floor: e.target.value})}
                                placeholder="эт." className="w-14 px-2 py-1 border border-border rounded text-xs" />
                              <input type="number" value={editApt.entrance} onChange={e => setEditApt({...editApt, entrance: e.target.value})}
                                placeholder="под." className="w-14 px-2 py-1 border border-border rounded text-xs" />
                              <input type="number" step="0.1" value={editApt.areaSqm} onChange={e => setEditApt({...editApt, areaSqm: e.target.value})}
                                placeholder="м²" className="w-16 px-2 py-1 border border-border rounded text-xs" />
                              <button onClick={() => saveApartment(a.id)} className="p-1 text-forest hover:bg-forest/10 rounded"><Check size={13} /></button>
                              <button onClick={() => setEditingAptId(null)} className="p-1 text-ink/40 hover:bg-cream rounded"><X size={13} /></button>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 text-sm">
                                кв. <strong>{a.number}</strong>
                                {(a.floor || a.entrance || a.areaSqm) && (
                                  <span className="text-ink/50 ml-2 text-xs">
                                    {a.floor != null && `этаж ${a.floor}`}
                                    {a.entrance != null && ` · подъезд ${a.entrance}`}
                                    {a.areaSqm != null && ` · ${a.areaSqm} м²`}
                                  </span>
                                )}
                                <span className="text-ink/40 text-xs ml-2">· {a.memberships.length} участн.</span>
                              </div>
                              <button onClick={() => {
                                setEditingAptId(a.id)
                                setEditApt({
                                  number: a.number,
                                  floor: a.floor?.toString() ?? '',
                                  entrance: a.entrance?.toString() ?? '',
                                  areaSqm: a.areaSqm?.toString() ?? '',
                                })
                                setError('')
                              }} title="Изменить" className="shrink-0 p-1 text-ink/40 hover:text-forest hover:bg-forest/5 rounded">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => deleteApartment(a.id, a.number)} title="Удалить"
                                className="shrink-0 p-1 text-ink/40 hover:text-red-500 hover:bg-red-50 rounded">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                        {aOpen && (
                          <div className="border-t border-border px-3 py-2 bg-cream/40">
                            {a.memberships.length === 0 ? (
                              <p className="text-xs text-ink/40 italic">никто не привязан</p>
                            ) : (
                              <ul className="space-y-1">
                                {a.memberships.map(m => (
                                  <li key={m.id} className="flex items-center gap-2 text-xs">
                                    <User size={12} className="text-ink/40" />
                                    <span className="font-medium">{m.user.name ?? m.user.email}</span>
                                    <span className="text-ink/50">{m.user.phone ?? '— нет тел.'}</span>
                                    {m.user.phoneVerified && <BadgeCheck size={12} className="text-forest" />}
                                    <span className="text-ink/40">· {m.role}{m.isOwner && ' · собственник'}</span>
                                    {m.areaSqm && <span className="text-ink/40">· {m.areaSqm} м²</span>}
                                    {m.verifiedAt && <span className="text-forest text-[10px]">✓ ПЭП</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add apartment */}
                  {addingApt === b.id ? (
                    <form onSubmit={(e) => createApartment(e, b.id)} className="flex gap-2 items-center pt-1">
                      <input type="text" value={newAptNumber} onChange={e => setNewAptNumber(e.target.value)}
                        placeholder="Номер квартиры" autoFocus
                        className="flex-1 px-2 py-1.5 border border-border rounded-lg text-sm" />
                      <button type="submit" className="px-3 py-1.5 bg-forest text-white rounded-lg text-xs">+ Создать</button>
                      <button type="button" onClick={() => { setAddingApt(null); setNewAptNumber('') }}
                        className="px-2 py-1.5 border border-border rounded-lg text-xs">Отмена</button>
                    </form>
                  ) : (
                    <button onClick={() => setAddingApt(b.id)}
                      className="text-xs text-forest hover:underline inline-flex items-center gap-1 pt-1">
                      <Plus size={12} /> Добавить квартиру
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add building */}
      <div className="mt-4">
        {addingBuilding ? (
          <form onSubmit={createBuilding} className="bg-white border border-border rounded-2xl p-4 flex gap-2 items-center">
            <input type="text" value={newBuildingAddress} onChange={e => setNewBuildingAddress(e.target.value)}
              placeholder="Адрес здания (улица, дом)" autoFocus
              className="flex-1 px-3 py-2 border border-border rounded-xl text-sm" />
            <button type="submit"
              className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium">+ Создать</button>
            <button type="button" onClick={() => { setAddingBuilding(false); setNewBuildingAddress('') }}
              className="px-3 py-2 border border-border rounded-xl text-sm">Отмена</button>
          </form>
        ) : (
          <button onClick={() => setAddingBuilding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium">
            <Plus size={16} /> Добавить здание
          </button>
        )}
      </div>
    </div>
  )
}
