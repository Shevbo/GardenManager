'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GOV_ROLES, GOV_ROLE_LABELS, GOV_ROLE_HINTS } from '@/lib/org-roles-labels'

type Member = { id: string; label: string }

export function RolesEditor({
  orgId,
  members,
  initial,
}: {
  orgId: string
  members: Member[]
  initial: Record<string, string>
}) {
  const router = useRouter()
  const [assignments, setAssignments] = useState<Record<string, string>>(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function change(role: string, userId: string) {
    setBusy(role); setError('')
    const prev = assignments[role] ?? ''
    setAssignments(a => ({ ...a, [role]: userId }))
    try {
      const res = userId
        ? await fetch('/api/admin/org/roles', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgId, role, userId }),
          })
        : await fetch('/api/admin/org/roles', {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgId, role }),
          })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Не удалось сохранить')
        setAssignments(a => ({ ...a, [role]: prev }))
        return
      }
      router.refresh()
    } catch {
      setError('Сеть недоступна')
      setAssignments(a => ({ ...a, [role]: prev }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
      {GOV_ROLES.map(role => (
        <div key={role} className="bg-white border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink">{GOV_ROLE_LABELS[role]}</p>
            <p className="text-xs text-ink/50 mt-0.5">{GOV_ROLE_HINTS[role]}</p>
          </div>
          <select
            value={assignments[role] ?? ''}
            disabled={busy === role}
            onChange={e => change(role, e.target.value)}
            className="w-56 px-3 py-2 border border-border rounded-xl text-sm bg-white disabled:opacity-60 shrink-0"
          >
            <option value="">— не назначен —</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      ))}
      <p className="text-xs text-ink/40 pt-1">
        «Администратор платформы» назначается на уровне платформы и здесь не редактируется.
      </p>
    </div>
  )
}
