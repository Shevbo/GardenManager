'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Building2 } from 'lucide-react'
import { usePrompt } from '@/components/ui/dialog'

type Row = {
  id: string
  requestedAddress: string
  addressNormalized: string | null
  apartmentNumber: string | null
  areaSqm: number | null
  createdAt: string
  user: { email: string | null; name: string | null }
}

type Org = { id: string; name: string }

type Props = {
  rows: Row[]
  orgs: Org[]
}

export function RegistrationsTable({ rows, orgs }: Props) {
  const prompt = usePrompt()
  const router = useRouter()
  const [orgChoice, setOrgChoice] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  const groups = useMemo(() => {
    const m = new Map<string, Row[]>()
    for (const r of rows) {
      const key = r.addressNormalized ?? r.requestedAddress
      const arr = m.get(key) ?? []
      arr.push(r)
      m.set(key, arr)
    }
    return Array.from(m.entries())
  }, [rows])

  async function approve(reg: Row) {
    setBusy(reg.id); setError('')
    try {
      const res = await fetch(`/api/admin/platform/registrations/${reg.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: orgChoice[reg.id] || null,
          address: reg.requestedAddress,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Не удалось одобрить')
        return
      }
      router.refresh()
    } finally { setBusy(null) }
  }

  async function reject(reg: Row) {
    const reason = await prompt({
      title: 'Отклонить заявку?',
      message: `От ${reg.user.email ?? reg.user.name}.`,
      placeholder: 'Причина (опционально)',
      multiline: true,
      confirmLabel: 'Отклонить',
    })
    if (reason === null) return
    setBusy(reg.id); setError('')
    try {
      const res = await fetch(`/api/admin/platform/registrations/${reg.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Не удалось')
        return
      }
      router.refresh()
    } finally { setBusy(null) }
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-ink/50">
        <Building2 size={32} className="mx-auto mb-3 opacity-50" />
        <p>Очередь пуста</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {groups.map(([key, regs]) => (
        <div key={key} className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="bg-cream/50 px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium text-ink">{regs[0].requestedAddress}</p>
                {regs.length > 1 && (
                  <p className="text-xs text-ink/50 mt-0.5">
                    {regs.length} заявок на этот адрес — одобрение создаст дом и применит ко всем
                  </p>
                )}
              </div>
              <select
                value={orgChoice[regs[0].id] ?? ''}
                onChange={e => {
                  const v = e.target.value
                  setOrgChoice(prev => {
                    const next = { ...prev }
                    for (const r of regs) next[r.id] = v
                    return next
                  })
                }}
                className="text-sm px-3 py-1.5 border border-border rounded-lg bg-white"
              >
                <option value="">Без организации</option>
                {orgs.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {regs.map(r => (
              <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">
                    {r.user.name ?? '—'}
                    {r.user.email && <span className="text-ink/50 ml-2">{r.user.email}</span>}
                  </p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {r.apartmentNumber && `кв. ${r.apartmentNumber}`}
                    {r.areaSqm && ` · ${r.areaSqm} м²`}
                    {` · ${new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approve(r)} disabled={busy === r.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-medium disabled:opacity-50">
                    <Check size={12} /> Одобрить
                  </button>
                  <button onClick={() => reject(r)} disabled={busy === r.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs text-ink/70 hover:text-red-600 disabled:opacity-50">
                    <X size={12} /> Отклонить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
