'use client'
import { useState, useEffect } from 'react'
import { LawyerChat } from './LawyerChat'

/** Document header shown atop every petition page: number + status + AI summary + lawyer chat. */
export function DocumentHeader({ petitionId, docNumber, statusLabel, initialSummary }: {
  petitionId: string
  docNumber: string | null
  statusLabel: string
  initialSummary: string | null
}) {
  const [summary, setSummary] = useState(initialSummary)
  const [loading, setLoading] = useState(false)

  async function refresh() {
    if (loading) return
    setLoading(true)
    try {
      const r = await fetch(`/api/petitions/${petitionId}/ai-summary`, { method: 'POST' })
      if (r.ok) { const d = await r.json() as { aiSummary: string }; setSummary(d.aiSummary) }
    } finally { setLoading(false) }
  }

  // Auto-generate the description on first view if it isn't cached yet, so we never
  // show a misleading "not generated" message for an already-edited document.
  useEffect(() => {
    if (!initialSummary) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          {docNumber ?? 'Документ'}
        </span>
        <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink-soft)', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '999px', padding: '2px 10px' }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '14px' }}>
        <p style={{ flex: 1, fontFamily: 'Golos Text, sans-serif', fontSize: '13px', lineHeight: 1.6, color: 'var(--ink-soft)', fontStyle: summary ? 'italic' : 'normal', margin: 0 }}>
          {summary ?? (loading ? 'Готовлю описание документа…' : '—')}
        </p>
        <button onClick={refresh} disabled={loading} title="Обновить описание от юриста ИИ"
          style={{ flexShrink: 0, fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--forest)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>
          {loading ? '…' : '↻'}
        </button>
      </div>

      <LawyerChat petitionId={petitionId} />
    </div>
  )
}
