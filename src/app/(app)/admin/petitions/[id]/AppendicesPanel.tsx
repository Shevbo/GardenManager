'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppendixDoc {
  id: string
  title: string
  status: string
  signedAt: string | null
  user: { name: string | null }
  template: { title: string }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: 'Unbounded, sans-serif',
  fontSize: '9px',
  fontWeight: 600,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--white)',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  overflow: 'hidden',
}

const cardHeaderStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--cream)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AppendicesPanel({
  petitionId,
  isAdmin,
}: {
  petitionId: string
  isAdmin: boolean
}) {
  const [appendices, setAppendices] = useState<AppendixDoc[]>([])
  const [appendicesLoading, setAppendicesLoading] = useState(false)

  // Load signed appendices for admin
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    async function load() {
      setAppendicesLoading(true)
      try {
        const r = await fetch(`/api/petitions/${petitionId}/appendices`)
        const data = r.ok ? await r.json() as { items: AppendixDoc[] } : { items: [] }
        if (!cancelled) setAppendices(data.items ?? [])
      } finally {
        if (!cancelled) setAppendicesLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [petitionId, isAdmin])

  if (!isAdmin) return null

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ ...cardStyle, borderLeft: '4px solid var(--forest)' }}>
        <div style={cardHeaderStyle}>
          <span style={sectionHeadingStyle}>Заявления, прикреплённые участниками</span>
          <Button
            variant="amber"
            size="sm"
            onClick={() => window.open(`/api/petitions/${petitionId}/package`, '_blank')}
          >
            Распечатать весь пакет
          </Button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          {appendicesLoading ? (
            <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>
              Загрузка...
            </p>
          ) : appendices.length === 0 ? (
            <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>
              Пока никто не прикрепил заявление.
            </p>
          ) : (
            <div>
              {appendices.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'Golos Text, sans-serif',
                    fontSize: '13px',
                    padding: '10px 0',
                    borderBottom: i < appendices.length - 1 ? '1px solid var(--border)' : 'none',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--ink)', fontWeight: 600 }}>{a.user.name ?? '—'}</div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: '12px', marginTop: '2px' }}>
                      {a.template.title}
                      {a.signedAt && (
                        <span style={{ marginLeft: '12px' }}>
                          {new Date(a.signedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/api/documents/${a.id}/export`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'Golos Text, sans-serif',
                      fontSize: '12px',
                      color: 'var(--forest, #0A3D2E)',
                      textDecoration: 'underline',
                      flexShrink: 0,
                    }}
                  >
                    Печать
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
