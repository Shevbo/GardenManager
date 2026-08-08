'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Lightbulb, Check, X, ListPlus } from 'lucide-react'
import { usePrompt } from '@/components/ui/dialog'

type Proposal = {
  id: string
  title: string
  description: string | null
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'INCLUDED'
  createdAt: string
  decisionNote: string | null
  assemblyId: string | null
  author: { id: string; name: string | null }
}

const STATUS_BADGE: Record<Proposal['status'], { label: string; cls: string }> = {
  PROPOSED: { label: 'На рассмотрении', cls: 'bg-amber/15 text-amber-700' },
  ACCEPTED: { label: 'Принята', cls: 'bg-forest/10 text-forest' },
  REJECTED: { label: 'Отклонена', cls: 'bg-red-50 text-red-600' },
  INCLUDED: { label: 'В повестке', cls: 'bg-blue-50 text-blue-700' },
}

/** «Вёрстка повестки»: собственники предлагают темы, председатель решает,
 *  из принятых тем формируется собрание. */
export function AgendaProposals({ isOwner }: { isOwner: boolean }) {
  const prompt = usePrompt()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [canDecide, setCanDecide] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/assemblies/proposals')
      if (!r.ok) return
      const d = await r.json() as { proposals: Proposal[]; canDecide: boolean }
      setProposals(d.proposals)
      setCanDecide(d.canDecide)
    } catch { /* следующая загрузка догонит */ }
  }, [])

  useEffect(() => { void load() }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/assemblies/proposals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || undefined }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error || 'Не удалось отправить'); return }
      setTitle(''); setDescription(''); setShowForm(false)
      void load()
    } finally { setBusy(false) }
  }

  async function decide(p: Proposal, action: 'accept' | 'reject') {
    let note: string | undefined
    if (action === 'reject') {
      const answer = await prompt({
        title: 'Отклонить тему?',
        message: `«${p.title}» — можно указать причину (автор увидит её в уведомлении).`,
        placeholder: 'Причина (необязательно)',
        confirmLabel: 'Отклонить',
      })
      if (answer === null) return
      note = answer || undefined
    }
    setBusy(true); setError('')
    try {
      const r = await fetch(`/api/assemblies/proposals/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error || 'Не удалось'); return }
      void load()
    } finally { setBusy(false) }
  }

  const accepted = proposals.filter(p => p.status === 'ACCEPTED')

  return (
    <div className="bg-white border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="font-display font-bold text-base inline-flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-600" /> Вёрстка повестки
        </h2>
        <div className="flex gap-2">
          {isOwner && !showForm && (
            <button onClick={() => setShowForm(true)}
              className="text-sm font-medium text-forest border border-forest/30 hover:bg-forest/5 px-3 py-1.5 rounded-xl transition-colors">
              Предложить тему
            </button>
          )}
          {canDecide && accepted.length > 0 && (
            <Link href={`/admin/assemblies/new?fromProposals=${accepted.map(p => p.id).join(',')}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-forest hover:bg-forest-mid px-3 py-1.5 rounded-xl transition-colors">
              <ListPlus size={15} /> Сформировать собрание ({accepted.length})
            </Link>
          )}
        </div>
      </div>
      <p className="text-xs text-ink/50 mb-4">
        Собственники предлагают темы для обсуждения; после «ОК» председателя принятые темы автоматически собираются в повестку собрания.
      </p>

      {showForm && (
        <form onSubmit={submit} className="mb-4 space-y-2 bg-cream/60 border border-border rounded-xl p-3">
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={300} required
            placeholder="Тема (напр. «Установка шлагбаума у корпуса 2»)"
            className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-white" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={4000}
            placeholder="Почему это важно (необязательно)"
            className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-white resize-y" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !title.trim()}
              className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {busy ? 'Отправляем…' : 'Отправить'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-xl text-sm">
              Отмена
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      <div className="space-y-2">
        {proposals.length === 0 && (
          <p className="text-sm text-ink/40">Предложений пока нет{isOwner ? ' — предложите первую тему.' : '.'}</p>
        )}
        {proposals.map(p => {
          const badge = STATUS_BADGE[p.status]
          return (
            <div key={p.id} className="border border-border rounded-xl p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">{p.title}</p>
                {p.description && <p className="text-xs text-ink/60 mt-0.5 line-clamp-2">{p.description}</p>}
                <p className="text-[11px] text-ink/40 mt-1">
                  {p.author.name ?? 'Собственник'} · {new Date(p.createdAt).toLocaleDateString('ru-RU')}
                  {p.status === 'REJECTED' && p.decisionNote && <> · причина: {p.decisionNote}</>}
                  {p.status === 'INCLUDED' && p.assemblyId && (
                    <> · <Link href={`/assemblies/${p.assemblyId}`} className="text-forest hover:underline">открыть собрание</Link></>
                  )}
                </p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${badge.cls}`}>
                {badge.label}
              </span>
              {canDecide && p.status === 'PROPOSED' && (
                <div className="shrink-0 flex gap-1">
                  <button onClick={() => decide(p, 'accept')} disabled={busy} title="Принять в повестку"
                    className="p-1.5 rounded-lg text-forest hover:bg-forest/10 transition-colors"><Check size={16} /></button>
                  <button onClick={() => decide(p, 'reject')} disabled={busy} title="Отклонить"
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><X size={16} /></button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
