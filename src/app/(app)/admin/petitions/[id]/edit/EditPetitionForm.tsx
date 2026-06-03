'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PetitionDraft = {
  id: string
  title: string
  draftText: string
  recipient: string | null
  discussionDeadline: string | null
  signingDeadline: string | null
}

function toLocalDatetime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16)
}

export function EditPetitionForm({ petition }: { petition: PetitionDraft }) {
  const router = useRouter()
  const [title, setTitle] = useState(petition.title)
  const [recipient, setRecipient] = useState(petition.recipient ?? '')
  const [draftText, setDraftText] = useState(petition.draftText)
  const [discussionDeadline, setDiscussionDeadline] = useState(toLocalDatetime(petition.discussionDeadline))
  const [signingDeadline, setSigningDeadline] = useState(toLocalDatetime(petition.signingDeadline))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/petitions/${petition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, draftText,
          recipient: recipient || null,
          discussionDeadline: discussionDeadline || undefined,
          signingDeadline: signingDeadline || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Не удалось сохранить')
        return
      }
      router.push(`/petition/${petition.id}`)
    } finally { setLoading(false) }
  }

  async function publish() {
    if (loading) return
    setLoading(true); setError('')
    try {
      await fetch(`/api/petitions/${petition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, draftText,
          recipient: recipient || null,
          discussionDeadline: discussionDeadline || undefined,
          signingDeadline: signingDeadline || undefined,
        }),
      })
      const res = await fetch(`/api/petitions/${petition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISCUSSION' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Не удалось открыть обсуждение')
        return
      }
      router.push(`/admin/petitions/${petition.id}/discussion`)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px 80px' }}>
      <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 20px', letterSpacing: '-0.02em' }}>Редактирование черновика</h1>

      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--white)', borderRadius: '6px', border: '1px solid var(--border)', borderLeft: '4px solid var(--forest)', padding: '22px', marginBottom: '16px' }}>
        <label className="block">
          <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Заголовок</span>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
            className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Кому (адресат)</span>
          <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
            placeholder="Например, Главе управы района"
            className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Текст заявления</span>
          <textarea value={draftText} onChange={e => setDraftText(e.target.value)} required rows={12}
            className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm leading-relaxed" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Дедлайн обсуждения</span>
            <input type="datetime-local" value={discussionDeadline}
              onChange={e => setDiscussionDeadline(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Дедлайн подписания</span>
            <input type="datetime-local" value={signingDeadline}
              onChange={e => setSigningDeadline(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
          </label>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {loading ? 'Сохраняем...' : 'Сохранить черновик'}
          </button>
          <button type="button" onClick={publish} disabled={loading}
            className="px-4 py-2 bg-amber text-ink rounded-xl text-sm font-medium disabled:opacity-50">
            Опубликовать на обсуждение →
          </button>
        </div>
      </form>
    </div>
  )
}
