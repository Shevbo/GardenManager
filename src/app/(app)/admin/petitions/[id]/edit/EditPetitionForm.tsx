'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Unbounded, sans-serif',
  fontSize: '8px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
  margin: '0 0 6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'Golos Text, sans-serif',
  fontSize: '14px',
  color: 'var(--ink)',
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  background: 'var(--white)',
  outline: 'none',
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
      <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 20px', letterSpacing: '-0.02em' }}>
        Редактирование черновика
      </h1>

      <form onSubmit={save} style={{ background: 'var(--white)', borderRadius: '6px', border: '1px solid var(--border)', borderLeft: '4px solid var(--forest)', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--cream)', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>📄 Текст заявления</span>
        </div>

        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label>
            <span style={labelStyle}>Заголовок</span>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={inputStyle} />
          </label>

          <label>
            <span style={labelStyle}>Кому (адресат)</span>
            <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
              placeholder="Например, Главе управы района" style={inputStyle} />
          </label>

          <label>
            <span style={labelStyle}>Текст заявления</span>
            <textarea value={draftText} onChange={e => setDraftText(e.target.value)} required rows={12}
              style={{ ...inputStyle, lineHeight: 1.7, resize: 'vertical' }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              <span style={labelStyle}>Дедлайн обсуждения</span>
              <input type="datetime-local" value={discussionDeadline}
                onChange={e => setDiscussionDeadline(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Дедлайн подписания</span>
              <input type="datetime-local" value={signingDeadline}
                onChange={e => setSigningDeadline(e.target.value)} style={inputStyle} />
            </label>
          </div>

          {error && <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
            <Button type="submit" variant="primary" size="sm" loading={loading}>
              {loading ? 'Сохраняем...' : 'Сохранить черновик'}
            </Button>
            <Button type="button" variant="amber" size="sm" onClick={publish} disabled={loading}>
              Опубликовать на обсуждение →
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
