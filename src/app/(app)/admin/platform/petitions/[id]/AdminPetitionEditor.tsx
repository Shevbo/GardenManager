'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ALL_STATUSES, type PetitionStatus } from '@/lib/petition-status'
import { STATUS_LABEL } from '@/lib/petition-status-label'

type Petition = {
  id: string
  title: string
  status: string
  orgId: string
  orgGroupId: string | null
  activityId: string | null
  recipient: string | null
  senderLine: string | null
  draftText: string
  finalText: string | null
  aiSummary: string | null
  isPublic: boolean
  discussionDeadline: string | null
  signingDeadline: string | null
  signatures: number
  comments: number
  docNumber: string | null
}
type Opt = { id: string; name: string }

function toLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const label = 'block font-display text-[10px] font-bold tracking-[0.08em] uppercase text-ink/50 mb-1.5'
const field = 'w-full text-sm text-ink px-3 py-2 border border-border rounded-md bg-white outline-none focus:border-forest/40'

export function AdminPetitionEditor({
  petition, orgs, groups, activities,
}: {
  petition: Petition; orgs: Opt[]; groups: Opt[]; activities: Opt[]
}) {
  const router = useRouter()
  const [f, setF] = useState({
    title: petition.title,
    status: petition.status,
    orgId: petition.orgId,
    orgGroupId: petition.orgGroupId ?? '',
    activityId: petition.activityId ?? '',
    recipient: petition.recipient ?? '',
    senderLine: petition.senderLine ?? '',
    draftText: petition.draftText,
    finalText: petition.finalText ?? '',
    aiSummary: petition.aiSummary ?? '',
    isPublic: petition.isPublic,
    discussionDeadline: toLocal(petition.discussionDeadline),
    signingDeadline: toLocal(petition.signingDeadline),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF(prev => ({ ...prev, [k]: v })); setSaved(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError(''); setSaved(false)
    try {
      const res = await fetch(`/api/admin/platform/petitions/${petition.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: f.title,
          status: f.status,
          orgId: f.orgId,
          orgGroupId: f.orgGroupId || null,
          activityId: f.activityId || null,
          recipient: f.recipient || null,
          senderLine: f.senderLine || null,
          draftText: f.draftText,
          finalText: f.finalText || null,
          aiSummary: f.aiSummary || null,
          isPublic: f.isPublic,
          discussionDeadline: f.discussionDeadline || null,
          signingDeadline: f.signingDeadline || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Не удалось сохранить')
        return
      }
      setSaved(true)
      router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={save}>
      <div className="flex items-baseline justify-between mb-1 gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">Правка заявления</h1>
        {petition.docNumber && <span className="text-sm text-ink/40 font-mono">{petition.docNumber}</span>}
      </div>
      <p className="text-ink/50 text-sm mb-6">
        Суперадмин: доступны все поля и любой статус, независимо от стадии. {petition.signatures} подписей · {petition.comments} комментариев.
      </p>

      <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className={label}>Статус (любой)</span>
            <select value={f.status} onChange={e => set('status', e.target.value)} className={`${field} cursor-pointer`}>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s as PetitionStatus]}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-1.5">
            <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={f.isPublic} onChange={e => set('isPublic', e.target.checked)} className="w-4 h-4 accent-forest" />
              Публичное (видно жителям)
            </label>
          </div>
        </div>

        <div>
          <span className={label}>Заголовок</span>
          <input type="text" value={f.title} onChange={e => set('title', e.target.value)} required className={field} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className={label}>Организация</span>
            <select value={f.orgId} onChange={e => set('orgId', e.target.value)} className={`${field} cursor-pointer`}>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>Группа организаций</span>
            <select value={f.orgGroupId} onChange={e => set('orgGroupId', e.target.value)} className={`${field} cursor-pointer`}>
              <option value="">— нет —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>Активность</span>
            <select value={f.activityId} onChange={e => set('activityId', e.target.value)} className={`${field} cursor-pointer`}>
              <option value="">— нет —</option>
              {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className={label}>Кому (адресат)</span>
            <textarea value={f.recipient} onChange={e => set('recipient', e.target.value)} rows={4} className={`${field} leading-relaxed resize-y`} />
          </div>
          <div>
            <span className={label}>От кого (заявитель)</span>
            <textarea value={f.senderLine} onChange={e => set('senderLine', e.target.value)} rows={4} className={`${field} leading-relaxed resize-y`} />
          </div>
        </div>

        <div>
          <span className={label}>Текст заявления (черновик)</span>
          <textarea value={f.draftText} onChange={e => set('draftText', e.target.value)} required rows={12} className={`${field} leading-relaxed resize-y`} />
        </div>

        <div>
          <span className={label}>Финальный текст (после согласования / для выгрузки)</span>
          <textarea value={f.finalText} onChange={e => set('finalText', e.target.value)} rows={6} className={`${field} leading-relaxed resize-y`}
            placeholder="Пусто — используется черновик" />
        </div>

        <div>
          <span className={label}>Краткое описание от юриста ИИ</span>
          <textarea value={f.aiSummary} onChange={e => set('aiSummary', e.target.value)} rows={3} className={`${field} leading-relaxed resize-y`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className={label}>Дедлайн обсуждения</span>
            <input type="datetime-local" value={f.discussionDeadline} onChange={e => set('discussionDeadline', e.target.value)} className={field} />
          </div>
          <div>
            <span className={label}>Дедлайн подписания</span>
            <input type="datetime-local" value={f.signingDeadline} onChange={e => set('signingDeadline', e.target.value)} className={field} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-forest">✓ Сохранено</p>}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" variant="primary" size="sm" loading={loading}>
            {loading ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </form>
  )
}
