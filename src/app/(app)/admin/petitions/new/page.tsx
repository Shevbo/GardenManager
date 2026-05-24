'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewPetitionPage() {
  const router = useRouter()
  const [orgId, setOrgId] = useState('')
  const [title, setTitle] = useState('')
  const [draftText, setDraftText] = useState('')
  const [discussionDeadline, setDiscussionDeadline] = useState('')
  const [signingDeadline, setSigningDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then((data: { orgId?: string }) => { if (data.orgId) setOrgId(data.orgId) })
      .catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) { setError('Организация не найдена'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/petitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, title, draftText, discussionDeadline, signingDeadline }),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok || !data.id) {
        setError(data.error ?? 'Ошибка создания')
        return
      }
      const patchRes = await fetch(`/api/petitions/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISCUSSION' }),
      })
      if (!patchRes.ok) {
        const patchData = await patchRes.json() as { error?: string }
        setError(patchData.error ?? 'Ошибка открытия обсуждения')
        return
      }
      router.push(`/admin/petitions/${data.id}/discussion`)
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  const charCount = draftText.length

  return (
    <div style={{ minHeight: '100%', background: 'var(--cream)', overflowY: 'auto' }}>

      {/* Nav */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--white)',
        padding: '0 24px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Link href="/admin/petitions" style={{
          color: 'var(--ink-soft)',
          fontSize: '13px',
          textDecoration: 'none',
          fontFamily: 'Golos Text, sans-serif',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          ← Заявления
        </Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 3V15M3 9H15" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 style={{
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}>
              Новое заявление
            </h1>
          </div>
          <p style={{
            fontFamily: 'Golos Text, sans-serif',
            fontSize: '14px',
            color: 'var(--ink-soft)',
            margin: '0 0 0 48px',
          }}>
            После создания заявление сразу откроется для обсуждения
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            color: '#991B1B',
            fontSize: '14px',
            fontFamily: 'Golos Text, sans-serif',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>

          {/* Title field */}
          <div style={{
            background: 'var(--white)',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            marginBottom: '12px',
            boxShadow: '0 1px 3px rgba(10,61,46,0.05)',
          }}>
            <div style={{
              padding: '10px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--cream)',
            }}>
              <label style={{
                fontFamily: 'Unbounded, sans-serif',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--ink-soft)',
              }}>
                Заголовок
              </label>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="Краткое название заявления..."
              style={{
                width: '100%',
                padding: '18px 20px',
                border: 'none',
                outline: 'none',
                fontFamily: 'Unbounded, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--ink)',
                background: 'transparent',
                letterSpacing: '-0.01em',
              }}
            />
          </div>

          {/* Draft text */}
          <div style={{
            background: 'var(--white)',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            borderLeft: '4px solid var(--forest)',
            overflow: 'hidden',
            marginBottom: '12px',
            boxShadow: '0 1px 3px rgba(10,61,46,0.05)',
          }}>
            <div style={{
              padding: '10px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--cream)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <label style={{
                fontFamily: 'Unbounded, sans-serif',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--ink-soft)',
              }}>
                Текст заявления
              </label>
              {charCount > 0 && (
                <span style={{
                  fontFamily: 'Golos Text, sans-serif',
                  fontSize: '11px',
                  color: 'var(--ink-soft)',
                  opacity: 0.7,
                }}>
                  {charCount.toLocaleString('ru')} симв.
                </span>
              )}
            </div>
            <textarea
              value={draftText}
              onChange={e => setDraftText(e.target.value)}
              required
              placeholder="Мы, нижеподписавшиеся собственники жилых помещений..."
              style={{
                width: '100%',
                padding: '20px 20px',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                minHeight: '220px',
                fontFamily: 'Golos Text, sans-serif',
                fontSize: '15px',
                lineHeight: '1.75',
                color: 'var(--ink)',
                background: 'transparent',
              }}
            />
          </div>

          {/* Deadlines */}
          <div style={{
            background: 'var(--white)',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            marginBottom: '28px',
            boxShadow: '0 1px 3px rgba(10,61,46,0.05)',
          }}>
            <div style={{
              padding: '10px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--cream)',
            }}>
              <span style={{
                fontFamily: 'Unbounded, sans-serif',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--ink-soft)',
              }}>
                Сроки
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ padding: '18px 20px', borderRight: '1px solid var(--border)' }}>
                <label style={{
                  display: 'block',
                  fontFamily: 'Golos Text, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--ink-soft)',
                  marginBottom: '8px',
                }}>
                  Конец обсуждения
                </label>
                <input
                  type="datetime-local"
                  value={discussionDeadline}
                  onChange={e => setDiscussionDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontFamily: 'Golos Text, sans-serif',
                    fontSize: '13px',
                    color: 'var(--ink)',
                    background: 'var(--cream)',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ padding: '18px 20px' }}>
                <label style={{
                  display: 'block',
                  fontFamily: 'Golos Text, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--ink-soft)',
                  marginBottom: '8px',
                }}>
                  Конец подписания
                </label>
                <input
                  type="datetime-local"
                  value={signingDeadline}
                  onChange={e => setSigningDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontFamily: 'Golos Text, sans-serif',
                    fontSize: '13px',
                    color: 'var(--ink)',
                    background: 'var(--cream)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !title.trim() || !draftText.trim()}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: '12px',
              border: 'none',
              background: loading || !title.trim() || !draftText.trim() ? 'var(--cream-dark)' : 'var(--forest)',
              color: loading || !title.trim() || !draftText.trim() ? 'var(--ink-soft)' : 'var(--white)',
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              cursor: loading || !title.trim() || !draftText.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Создаём...
              </>
            ) : (
              'Создать заявление и открыть обсуждение →'
            )}
          </button>
        </form>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          input[type="datetime-local"]:focus { border-color: var(--forest) !important; }
        `}</style>

      </div>
    </div>
  )
}
