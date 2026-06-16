'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { ALL_STATUSES, type PetitionStatus } from '@/lib/petition-status'
import { STATUS_LABEL } from '@/lib/petition-status-label'

type Row = {
  id: string
  title: string
  status: string
  orgName: string
  signatures: number
  comments: number
  createdAt: string
}

export function AdminPetitionRow({ petition }: { petition: Row }) {
  const router = useRouter()
  const [status, setStatus] = useState(petition.status)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function changeStatus(next: string) {
    const prev = status
    setStatus(next)
    setBusy(true); setErr('')
    try {
      const res = await fetch(`/api/admin/platform/petitions/${petition.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErr(d.error || 'Не удалось сменить статус')
        setStatus(prev)
        return
      }
      router.refresh()
    } finally { setBusy(false) }
  }

  async function forceDelete() {
    const warn = petition.signatures > 0
      ? `Удалить «${petition.title}»?\n\nУ заявления ${petition.signatures} подпис(и/ей) — они будут удалены вместе с заявлением. Действие необратимо.`
      : `Удалить «${petition.title}»?\n\nДействие необратимо.`
    if (!window.confirm(warn)) return
    setBusy(true); setErr('')
    try {
      const res = await fetch(`/api/admin/platform/petitions/${petition.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErr(d.error || 'Не удалось удалить')
        return
      }
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <Link href={`/admin/platform/petitions/${petition.id}`} className="font-medium text-ink hover:underline block truncate">
          {petition.title}
        </Link>
        <p className="text-xs text-ink/50 mt-0.5 truncate">
          {petition.orgName} · {petition.signatures} подп. · {petition.comments} комм.
        </p>
        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      </div>

      <select
        value={status}
        onChange={e => changeStatus(e.target.value)}
        disabled={busy}
        title="Сменить статус (любой — права суперадмина)"
        className="text-xs font-medium rounded-lg border border-border bg-cream px-2.5 py-1.5 text-ink cursor-pointer focus:outline-none focus:border-forest/40 disabled:opacity-50"
      >
        {ALL_STATUSES.map(s => (
          <option key={s} value={s}>{STATUS_LABEL[s as PetitionStatus]}</option>
        ))}
      </select>

      <Link
        href={`/admin/platform/petitions/${petition.id}`}
        title="Полная правка"
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-ink/40 hover:border-forest/30 hover:text-forest hover:bg-forest/5 transition-colors"
      >
        <Pencil size={14} />
      </Link>

      <button
        onClick={forceDelete}
        disabled={busy}
        title="Удалить заявление (форсированно, даже с подписями)"
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-ink/30 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
