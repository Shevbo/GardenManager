'use client'
import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { TemplateVariable } from '@/lib/pdf/types'

type PetitionDraft = {
  id: string
  title: string
  draftText: string
  recipient: string | null
  senderLine: string | null
  discussionDeadline: string | null
  signingDeadline: string | null
  appliedTemplateTitle: string | null
}

type TemplateItem = {
  id: string
  title: string
  variables: TemplateVariable[]
  bodyTemplate: string
}

type ProfileData = {
  name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
}

function toLocalDatetime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16)
}

/** Client-side {{var}} substitution (mirrors src/lib/templates.applyTemplate). */
function applyTemplateLocal(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k: string) => values[k] ?? '')
}

const PROFILE_MAP: Record<string, keyof ProfileData> = {
  applicant_name: 'name',
  applicant_phone: 'phone',
  applicant_email: 'email',
  applicant_address: 'address',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'Unbounded, sans-serif', fontSize: '8px', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '0 0 6px',
}
const inputStyle: React.CSSProperties = {
  width: '100%', fontFamily: 'Golos Text, sans-serif', fontSize: '14px', color: 'var(--ink)',
  padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--white)', outline: 'none',
}
const panelStyle: React.CSSProperties = {
  marginTop: '12px', background: 'var(--white)', borderRadius: '6px', border: '1px solid var(--border)',
  borderLeft: '4px solid var(--sky, #4EA8DE)', overflow: 'hidden',
}
const panelHeadStyle: React.CSSProperties = {
  padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--cream)',
  fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em',
  textTransform: 'uppercase', color: 'var(--ink-soft)',
}

/** Renders revised text with words absent from the original highlighted (additions). */
function HighlightAdditions({ original, revised }: { original: string; revised: string }) {
  const origWords = new Set(original.toLowerCase().split(/\s+/).filter(Boolean))
  const tokens = revised.split(/(\s+)/)
  return (
    <>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok) || tok === '') return <Fragment key={i}>{tok}</Fragment>
        const isNew = !origWords.has(tok.toLowerCase().replace(/[.,;:!?»«"()]/g, ''))
        return isNew
          ? <mark key={i} style={{ background: '#D1FAE5', color: 'var(--ink)', borderRadius: '2px' }}>{tok}</mark>
          : <Fragment key={i}>{tok}</Fragment>
      })}
    </>
  )
}

export function EditPetitionForm({ petition }: { petition: PetitionDraft }) {
  const router = useRouter()
  const [title, setTitle] = useState(petition.title)
  const [recipient, setRecipient] = useState(petition.recipient ?? '')
  const [senderLine, setSenderLine] = useState(petition.senderLine ?? '')
  const [draftText, setDraftText] = useState(petition.draftText)
  const [discussionDeadline, setDiscussionDeadline] = useState(toLocalDatetime(petition.discussionDeadline))
  const [signingDeadline, setSigningDeadline] = useState(toLocalDatetime(petition.signingDeadline))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(petition.appliedTemplateTitle)

  // Template panel
  const [tplOpen, setTplOpen] = useState(false)
  const [tplLoading, setTplLoading] = useState(false)
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [selectedTplId, setSelectedTplId] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [tplError, setTplError] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)

  // AI panel
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ revisedText: string; summary: string; base: string } | null>(null)
  const [aiError, setAiError] = useState('')

  const selectedTemplate = templates.find(t => t.id === selectedTplId) ?? null
  const previewText = selectedTemplate ? applyTemplateLocal(selectedTemplate.bodyTemplate ?? '', fieldValues) : ''

  async function openTpl() {
    setAiOpen(false)
    if (tplOpen) { setTplOpen(false); return }
    setTplLoading(true); setTplError('')
    try {
      const res = await fetch(`/api/petitions/${petition.id}/apply-template`)
      if (!res.ok) { setTplError('Не удалось загрузить шаблоны'); setTplOpen(true); return }
      const data = await res.json() as { templates: TemplateItem[]; profile: ProfileData | null }
      setTemplates(data.templates ?? [])
      setProfile(data.profile ?? null)
      setSelectedTplId(''); setFieldValues({})
      setTplOpen(true)
    } finally { setTplLoading(false) }
  }

  function selectTpl(id: string) {
    setSelectedTplId(id); setTplError('')
    const tmpl = templates.find(t => t.id === id)
    if (!tmpl) { setFieldValues({}); return }
    const prefill: Record<string, string> = {}
    for (const v of tmpl.variables) {
      if (v.source === 'profile' && profile) {
        const field = PROFILE_MAP[v.name]
        const val = field ? profile[field] : null
        if (val) prefill[v.name] = val
      }
    }
    setFieldValues(prefill)
  }

  async function insertTemplate() {
    if (!selectedTplId) return
    setApplyLoading(true); setTplError('')
    try {
      const res = await fetch(`/api/petitions/${petition.id}/apply-template`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTplId, values: fieldValues }),
      })
      const data = await res.json()
      if (!res.ok) {
        setTplError(data.missing?.length ? 'Заполните: ' + (data.missing as string[]).join(', ') : (data.error || 'Не удалось применить шаблон'))
        return
      }
      if (data.title) setTitle(data.title)
      if (data.recipient !== undefined) setRecipient(data.recipient ?? '')
      if (data.senderLine !== undefined) setSenderLine(data.senderLine ?? '')
      if (data.draftText !== undefined) setDraftText(data.draftText)
      setAppliedTemplate(selectedTemplate?.title ?? null)
      setTplOpen(false)
    } finally { setApplyLoading(false) }
  }

  async function runAi() {
    setTplOpen(false)
    if (!aiOpen) setAiOpen(true)
    setAiLoading(true); setAiError(''); setAiResult(null)
    try {
      const res = await fetch(`/api/petitions/${petition.id}/legal-polish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draftText }),
      })
      const data = await res.json()
      if (!res.ok) { setAiError(data.error || 'Ошибка обработки ИИ'); return }
      setAiResult({ revisedText: data.revisedText, summary: data.summary, base: draftText })
    } finally { setAiLoading(false) }
  }

  function acceptAi() {
    if (!aiResult) return
    setDraftText(aiResult.revisedText)
    setAiOpen(false); setAiResult(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/petitions/${petition.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, draftText, recipient: recipient || null, senderLine: senderLine || null, discussionDeadline: discussionDeadline || undefined, signingDeadline: signingDeadline || undefined }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Не удалось сохранить'); return }
      router.push(`/petition/${petition.id}`)
    } finally { setLoading(false) }
  }

  async function publish() {
    if (loading) return
    setLoading(true); setError('')
    try {
      await fetch(`/api/petitions/${petition.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, draftText, recipient: recipient || null, senderLine: senderLine || null, discussionDeadline: discussionDeadline || undefined, signingDeadline: signingDeadline || undefined }),
      })
      const res = await fetch(`/api/petitions/${petition.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISCUSSION' }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Не удалось открыть обсуждение'); return }
      router.push(`/admin/petitions/${petition.id}/discussion`)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px 80px' }}>
      {/* Text-assist buttons */}
      <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <Button type="button" variant="secondary" size="sm" onClick={openTpl} loading={tplLoading}>
          {tplOpen ? 'Закрыть шаблон' : '📋 Добавить текст из шаблона'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={runAi} loading={aiLoading} disabled={!draftText.trim()}>
          {aiOpen ? 'Закрыть юриста ИИ' : '⚖️ Обработать юристом ИИ'}
        </Button>
      </div>

      {appliedTemplate && (
        <div style={{ marginBottom: '16px', padding: '8px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#1E40AF' }}>
          Применён шаблон: <strong>{appliedTemplate}</strong>
        </div>
      )}

      {/* Template panel */}
      {tplOpen && (
        <div style={panelStyle}>
          <div style={panelHeadStyle}>📋 Шаблон коллективного заявления</div>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {templates.length === 0 ? (
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>Нет доступных шаблонов.</p>
            ) : (
              <label>
                <span style={labelStyle}>Шаблон</span>
                <select value={selectedTplId} onChange={e => selectTpl(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">— выберите шаблон —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </label>
            )}

            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedTemplate.variables.map(v => (
                  <label key={v.name}>
                    <span style={labelStyle}>
                      {v.label}{v.required && <span style={{ color: '#DC2626', marginLeft: '2px' }}>*</span>}
                      {v.source === 'profile' && <span style={{ marginLeft: '6px', opacity: 0.6 }}>(из профиля)</span>}
                    </span>
                    {v.type === 'multiline' ? (
                      <textarea value={fieldValues[v.name] ?? ''} onChange={e => setFieldValues(p => ({ ...p, [v.name]: e.target.value }))} rows={3} style={{ ...inputStyle, lineHeight: 1.6, resize: 'vertical' }} />
                    ) : v.type === 'select' && v.options ? (
                      <select value={fieldValues[v.name] ?? ''} onChange={e => setFieldValues(p => ({ ...p, [v.name]: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">— выберите —</option>
                        {v.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={v.type === 'date' ? 'date' : 'text'} value={fieldValues[v.name] ?? ''} onChange={e => setFieldValues(p => ({ ...p, [v.name]: e.target.value }))} style={inputStyle} />
                    )}
                  </label>
                ))}
              </div>
            )}

            {selectedTemplate && (
              <div>
                <span style={labelStyle}>Предпросмотр (выделено — вставляемый текст)</span>
                <div style={{ padding: '14px', borderRadius: '6px', border: '1px solid var(--border)', background: '#F0FDF4', fontFamily: 'Golos Text, sans-serif', fontSize: '13px', lineHeight: 1.7, color: 'var(--ink)', whiteSpace: 'pre-wrap', maxHeight: '320px', overflowY: 'auto' }}>
                  <mark style={{ background: '#D1FAE5', color: 'var(--ink)' }}>{previewText || '— заполните поля —'}</mark>
                </div>
              </div>
            )}

            {tplError && <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: 0 }}>{tplError}</p>}
            {selectedTplId && (
              <div style={{ paddingTop: '4px' }}>
                <Button type="button" variant="primary" size="sm" onClick={insertTemplate} loading={applyLoading}>
                  {applyLoading ? 'Вставляем...' : 'Вставить в заявление'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI panel */}
      {aiOpen && (
        <div style={{ ...panelStyle, borderLeftColor: 'var(--forest)' }}>
          <div style={panelHeadStyle}>⚖️ Юрист ИИ — предпросмотр обработки</div>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {aiLoading && <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>Обрабатываем текст…</p>}
            {aiError && <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: 0 }}>{aiError}</p>}
            {aiResult && (
              <>
                <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>Что изменилось: {aiResult.summary}</p>
                <div style={{ padding: '14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--cream)', fontFamily: 'Golos Text, sans-serif', fontSize: '13px', lineHeight: 1.7, color: 'var(--ink)', whiteSpace: 'pre-wrap', maxHeight: '360px', overflowY: 'auto' }}>
                  <HighlightAdditions original={aiResult.base} revised={aiResult.revisedText} />
                </div>
                <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                  <Button type="button" variant="primary" size="sm" onClick={acceptAi}>Принять</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={runAi} loading={aiLoading}>Переобработать</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <form onSubmit={save} style={{ background: 'var(--white)', borderRadius: '6px', border: '1px solid var(--border)', borderLeft: '4px solid var(--forest)', overflow: 'hidden', marginTop: '16px', marginBottom: '16px' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--cream)', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>📄 Текст заявления</span>
        </div>

        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label>
            <span style={labelStyle}>Заголовок</span>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={inputStyle} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              <span style={labelStyle}>Кому (адресат)</span>
              <textarea value={recipient} onChange={e => setRecipient(e.target.value)} rows={4}
                placeholder={'Должность, звание\nФИО\nАдрес'} style={{ ...inputStyle, lineHeight: 1.5, resize: 'vertical' }} />
            </label>
            <label>
              <span style={labelStyle}>От кого (заявитель)</span>
              <textarea value={senderLine} onChange={e => setSenderLine(e.target.value)} rows={4}
                placeholder={'ФИО / представитель\nАдрес для ответа\nТелефон, e-mail'} style={{ ...inputStyle, lineHeight: 1.5, resize: 'vertical' }} />
            </label>
          </div>
          <label>
            <span style={labelStyle}>Текст заявления (только суть, без шапки)</span>
            <textarea value={draftText} onChange={e => setDraftText(e.target.value)} required rows={12} style={{ ...inputStyle, lineHeight: 1.7, resize: 'vertical' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              <span style={labelStyle}>Дедлайн обсуждения</span>
              <input type="datetime-local" value={discussionDeadline} onChange={e => setDiscussionDeadline(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Дедлайн подписания</span>
              <input type="datetime-local" value={signingDeadline} onChange={e => setSigningDeadline(e.target.value)} style={inputStyle} />
            </label>
          </div>

          {error && <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
            <Button type="submit" variant="primary" size="sm" loading={loading}>{loading ? 'Сохраняем...' : 'Сохранить черновик'}</Button>
            <Button type="button" variant="amber" size="sm" onClick={publish} disabled={loading}>Опубликовать на обсуждение →</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
