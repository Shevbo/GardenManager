'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CommentForm({ petitionId }: { petitionId: string }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/petitions/${petitionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        setText('')
        setFocused(false)
        router.refresh()
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Ошибка отправки')
      }
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div style={{
        background: 'var(--white)',
        borderRadius: '12px',
        border: `1px solid ${focused ? 'var(--forest)' : 'var(--border)'}`,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
        boxShadow: focused ? '0 0 0 3px rgba(10,61,46,0.08)' : 'none',
      }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ваши предложения по тексту заявления..."
          required
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            minHeight: '88px',
            padding: '14px 16px',
            fontFamily: 'Golos Text, sans-serif',
            fontSize: '14px',
            lineHeight: '1.65',
            color: 'var(--ink)',
            background: 'transparent',
          }}
        />
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
          background: 'var(--cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          {error ? (
            <span style={{ fontSize: '12px', color: '#991B1B', fontFamily: 'Golos Text, sans-serif' }}>
              {error}
            </span>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontFamily: 'Golos Text, sans-serif' }}>
              {text.length > 0 ? `${text.length} симв.` : 'Предложения помогут улучшить текст'}
            </span>
          )}
          <button
            type="submit"
            disabled={loading || !text.trim()}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: loading || !text.trim() ? 'var(--cream-dark)' : 'var(--forest)',
              color: loading || !text.trim() ? 'var(--ink-soft)' : 'var(--white)',
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </div>
    </form>
  )
}
