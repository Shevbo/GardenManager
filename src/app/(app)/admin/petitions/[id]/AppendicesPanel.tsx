'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface IndividualTemplate {
  id: string
  title: string
  category: string
}

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
  appendixTemplateIds,
  isAdmin,
}: {
  petitionId: string
  appendixTemplateIds: string[]
  isAdmin: boolean
}) {
  const [templates, setTemplates] = useState<IndividualTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  const [appendices, setAppendices] = useState<AppendixDoc[]>([])
  const [appendicesLoading, setAppendicesLoading] = useState(false)

  const [creatingId, setCreatingId] = useState<string | null>(null)
  const [createError, setCreateError] = useState('')

  // Load individual templates if there are appendix template IDs configured
  useEffect(() => {
    if (appendixTemplateIds.length === 0 && !isAdmin) return
    let cancelled = false
    async function load() {
      setTemplatesLoading(true)
      try {
        const r = await fetch('/api/documents/templates')
        const data = r.ok ? await r.json() as { items: IndividualTemplate[] } : { items: [] }
        if (!cancelled) setTemplates(data.items ?? [])
      } finally {
        if (!cancelled) setTemplatesLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [appendixTemplateIds.length, isAdmin])

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

  async function handleCreate(templateId: string) {
    setCreatingId(templateId)
    setCreateError('')
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, petitionId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setCreateError(d.error ?? 'Не удалось создать документ')
        return
      }
      window.location.href = '/documents'
    } finally {
      setCreatingId(null)
    }
  }

  const hasParticipantSection = appendixTemplateIds.length > 0
  const hasAdminSection = isAdmin

  if (!hasParticipantSection && !hasAdminSection) return null

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Participant section */}
      {hasParticipantSection && (
        <div style={{ ...cardStyle, marginBottom: '16px', borderLeft: '4px solid var(--sky, #4EA8DE)' }}>
          <div style={cardHeaderStyle}>
            <span style={sectionHeadingStyle}>Приложения к заявлению</span>
          </div>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: '0 0 4px' }}>
              Создайте своё приложение и подпишите его:
            </p>
            {templatesLoading ? (
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>
                Загрузка...
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {appendixTemplateIds.map(tid => {
                  const tmpl = templates.find(t => t.id === tid)
                  const label = tmpl ? tmpl.title : tid
                  return (
                    <Button
                      key={tid}
                      variant="secondary"
                      size="sm"
                      loading={creatingId === tid}
                      disabled={creatingId !== null}
                      onClick={() => handleCreate(tid)}
                    >
                      Создать: {label}
                    </Button>
                  )
                })}
              </div>
            )}
            {createError && (
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: 0 }}>
                {createError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Admin section */}
      {hasAdminSection && (
        <div style={{ ...cardStyle, borderLeft: '4px solid var(--forest)' }}>
          <div style={cardHeaderStyle}>
            <span style={sectionHeadingStyle}>Приложения участников (подписанные)</span>
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
                Нет подписанных приложений.
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
      )}
    </div>
  )
}
