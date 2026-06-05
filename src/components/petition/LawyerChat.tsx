'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/Button'

type Msg = { id: string; role: string; content: string; createdAt: string; authorName: string | null }

const cardStyle: React.CSSProperties = {
  background: 'var(--white)', borderRadius: '6px', border: '1px solid var(--border)',
  borderLeft: '4px solid var(--forest)', overflow: 'hidden', marginBottom: '16px',
}
const headStyle: React.CSSProperties = {
  padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--cream)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
  fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em',
  textTransform: 'uppercase', color: 'var(--ink-soft)',
}

export function LawyerChat({ petitionId }: { petitionId: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [quota, setQuota] = useState(5)
  const [used, setUsed] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/petitions/${petitionId}/lawyer`)
    if (r.ok) {
      const d = await r.json() as { messages: Msg[]; quota: number; used: number; isAdmin: boolean }
      setMessages(d.messages ?? []); setQuota(d.quota); setUsed(d.used); setIsAdmin(d.isAdmin)
    }
  }, [petitionId])

  useEffect(() => { if (open) void load() }, [open, load])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const reached = !isAdmin && used >= quota

  async function send() {
    const content = input.trim()
    if (!content || sending) return
    setSending(true); setError('')
    try {
      const r = await fetch(`/api/petitions/${petitionId}/lawyer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Ошибка'); if (d.quota !== undefined) setUsed(d.quota); return }
      setMessages(prev => [...prev, d.userMessage, d.assistantMessage])
      if (!isAdmin) setUsed(u => u + 1)
      setInput('')
    } catch { setError('Ошибка сети') } finally { setSending(false) }
  }

  function exportThread(format: 'pdf' | 'doc') {
    window.open(`/api/petitions/${petitionId}/lawyer/export?format=${format}`, '_blank')
  }
  function exportMsg(messageId: string, format: 'pdf' | 'doc') {
    window.open(`/api/petitions/${petitionId}/lawyer/export?format=${format}&messageId=${messageId}`, '_blank')
  }

  return (
    <div style={cardStyle}>
      <div style={headStyle}>
        <span>⚖️ Юрист ИИ по жилищному праву</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(o => !o)}>{open ? 'Свернуть' : 'Открыть чат'}</Button>
      </div>
      {open && (
        <div style={{ padding: '14px 18px' }}>
          <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
            {messages.length === 0 && <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>Задайте вопрос юристу по этому документу. Переписку видят все участники.</p>}
            {messages.map(m => {
              const ai = m.role === 'assistant'
              return (
                <div key={m.id} style={{ alignSelf: ai ? 'flex-start' : 'flex-end', maxWidth: '88%', background: ai ? '#F0FDF4' : '#EFF6FF', border: '1px solid ' + (ai ? '#BBF7D0' : '#BFDBFE'), borderRadius: '10px', padding: '8px 12px' }}>
                  <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '4px' }}>{ai ? 'Юрист ИИ' : (m.authorName ?? 'Участник')}</div>
                  <div style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  {ai && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button onClick={() => exportMsg(m.id, 'pdf')} style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '11px', color: 'var(--forest)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>PDF</button>
                      <button onClick={() => exportMsg(m.id, 'doc')} style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '11px', color: 'var(--forest)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>.doc</button>
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {error && <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: '0 0 8px' }}>{error}</p>}
          {reached ? (
            <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>Достигнут лимит вопросов юристу ИИ для этого документа ({quota}). Обратитесь к администратору организации.</p>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} rows={2} placeholder="Вопрос юристу по документу…"
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send() }}
                style={{ flex: 1, fontFamily: 'Golos Text, sans-serif', fontSize: '13px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '6px', resize: 'vertical', outline: 'none' }} />
              <Button type="button" variant="primary" size="sm" onClick={send} loading={sending}>Спросить</Button>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '11px', color: 'var(--ink-soft)' }}>{isAdmin ? 'Без лимита (админ)' : `Использовано ${used} из ${quota}`}</span>
            <span style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => exportThread('pdf')} style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '11px', color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Экспорт треда PDF</button>
              <button onClick={() => exportThread('doc')} style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '11px', color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>.doc</button>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
