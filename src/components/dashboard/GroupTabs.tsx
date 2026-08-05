'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Building2 } from 'lucide-react'

/** Home group tabs — one per group the user belongs to. Selecting a tab sets the
 *  active group (cookie) so every screen scopes to it. */
export function GroupTabs({ orgs, activeOrgId }: { orgs: Array<{ id: string; name: string }>; activeOrgId: string | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function pick(orgId: string) {
    if (orgId === activeOrgId || busy) return
    setBusy(true)
    try {
      await fetch('/api/me/active-org', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })
      router.refresh()
    } finally { setBusy(false) }
  }

  if (orgs.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap border-b border-[#E0DBD0] px-5">
      {orgs.map(o => {
        const active = o.id === activeOrgId
        return (
          <button
            key={o.id}
            onClick={() => pick(o.id)}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-t-lg border-b-2 -mb-px transition-colors disabled:opacity-60 ${
              active
                ? 'border-[#0A3D2E] text-[#0A3D2E] font-semibold bg-white'
                : 'border-transparent text-[#6B6B63] hover:text-[#1A1A18] hover:bg-white/60'
            }`}
          >
            <Building2 size={14} className="shrink-0" /> {o.name}
          </button>
        )
      })}
    </div>
  )
}
