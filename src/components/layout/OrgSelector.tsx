'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

type Membership = {
  membershipId: string
  orgId: string
  orgName: string
  apartmentNumber: string | null
  buildingAddress: string | null
}

export function OrgSelector() {
  const router = useRouter()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [activeMembershipId, setActiveMembershipId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('garden_active_membership='))
    const fromCookie = cookie ? cookie.split('=')[1] : null

    fetch('/api/me/memberships')
      .then(r => r.ok ? r.json() : null)
      .then((d: { memberships?: Membership[] } | null) => {
        if (!d?.memberships) return
        setMemberships(d.memberships)
        // Mirror the server's default (first membership by id) so the selector
        // label matches the dashboard when no explicit choice has been made yet.
        if (fromCookie && d.memberships.some(m => m.membershipId === fromCookie)) {
          setActiveMembershipId(fromCookie)
        } else if (d.memberships.length) {
          setActiveMembershipId(
            [...d.memberships].sort((a, b) => a.membershipId.localeCompare(b.membershipId))[0].membershipId,
          )
        }
      })
      .catch(() => {})
  }, [])

  async function pick(membershipId: string | null) {
    setOpen(false)
    setActiveMembershipId(membershipId)
    await fetch('/api/me/active-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipId }),
    })
    router.refresh()
  }

  if (memberships.length === 0) {
    return (
      <div className="px-3 py-3 border-b border-white/10">
        <div className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left opacity-60">
          <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white/40 text-xs font-bold">—</span>
          </div>
          <p className="text-white/40 text-xs">Не привязан к ЖК</p>
        </div>
      </div>
    )
  }

  const active = activeMembershipId
    ? memberships.find(m => m.membershipId === activeMembershipId)
    : null

  const label = active?.orgName ?? 'Все объекты'
  const subLabel = active
    ? [active.apartmentNumber && `кв. ${active.apartmentNumber}`, active.buildingAddress].filter(Boolean).join(' · ')
    : `${memberships.length} объект${memberships.length === 1 ? '' : 'а'}`

  return (
    <div className="relative px-3 py-3 border-b border-white/10">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 transition-colors text-left">
        <div className="w-7 h-7 bg-amber/20 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-amber text-xs font-bold">ЖК</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">{label}</p>
          <p className="text-white/40 text-[10px] truncate">{subLabel}</p>
        </div>
        <ChevronDown size={14} className={`text-white/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-30 bg-forest border border-white/10 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {memberships.length > 1 && (
            <button onClick={() => pick(null)}
              className={`w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 ${!activeMembershipId ? 'bg-white/15' : ''}`}>
              <p className="font-medium">Все объекты</p>
              <p className="text-white/50 text-[10px]">Сводный вид</p>
            </button>
          )}
          {memberships.map(m => (
            <button key={m.membershipId} onClick={() => pick(m.membershipId)}
              className={`w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 border-t border-white/5 ${activeMembershipId === m.membershipId ? 'bg-white/15' : ''}`}>
              <p className="font-medium truncate">{m.orgName}</p>
              <p className="text-white/50 text-[10px] truncate">
                {[m.apartmentNumber && `кв. ${m.apartmentNumber}`, m.buildingAddress].filter(Boolean).join(' · ') || '—'}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
