'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { TemplateVariable } from '@/lib/pdf/types'

type PetitionDraft = {
  id: string
  title: string
  draftText: string
  recipient: string | null
  discussionDeadline: string | null
  signingDeadline: string | null
  appendixTemplateIds: string[]
}

type TemplateItem = {
  id: string
  title: string
  variables: TemplateVariable[]
  bodyTemplate: string
}

type IndividualTemplate = {
  id: string
  title: string
  category: string
}

type ProfileData = {
  name?: string | null
  phone?: string | null
  email?: string | null
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

const PROFILE_MAP: Record<string, keyof ProfileData> = {
  applicant_name: 'name',
  applicant_phone: 'phone',
  applicant_email: 'email',
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

  // Appendix templates state
  const [individualTemplates, setIndividualTemplates] = useState<IndividualTemplate[]>([])
  const [individualTemplatesLoading, setIndividualTemplatesLoading] = useState(false)
  const [individualTemplatesPanelOpen, setIndividualTemplatesPanelOpen] = useState(false)
  const [appendixTemplateIds, setAppendixTemplateIds] = useState<string[]>(petition.appendixTemplateIds)
  const [appendixSaveLoading, setAppendixSaveLoading] = useState(false)
  const [appendixSaveError, setAppendixSaveError] = useState('')
  const [appendixSaveSuccess, setAppendixSaveSuccess] = useState(false)

  // Apply-template panel state
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false)
  const [templatePanelLoading, setTemplatePanelLoading] = useState(false)
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [templateError, setTemplateError] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)

  async function openTemplatePanel() {
    if (templatePanelOpen) {
      setTemplatePanelOpen(false)
      return
    }
    setTemplatePanelLoading(true)
    setTemplateError('')
    try {
      const res = await fetch(`/api/petitions/${petition.id}/apply-template`)
      if (!res.ok) {
        setTemplateError('Не удалось загрузить шаблоны')
        setTemplatePanelOpen(true)
        return
      }
      const data = await res.json()
      setTemplates(data.templates ?? [])
      setProfile(data.profile ?? null)
      setSelectedTemplateId('')
      setFieldValues({})
      setTemplatePanelOpen(true)
    } finally {
      setTemplatePanelLoading(false)
    }
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId)
    setTemplateError('')
    const tmpl = templates.find(t => t.id === templateId)
    if (!tmpl) { setFieldValues({}); return }
    // Pre-fill profile variables
    const prefilled: Record<string, string> = {}
    for (const v of tmpl.variables) {
      if (v.source === 'profile' && profile) {
        const field = PROFILE_MAP[v.name]
        const val = field ? profile[field] : null
        if (val) prefilled[v.name] = val
      }
    }
    setFieldValues(prefilled)
  }

  async function applyTemplate() {
    if (!selectedTemplateId) return
    setApplyLoading(true)
    setTemplateError('')
    try {
      const res = await fetch(`/api/petitions/${petition.id}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId, values: fieldValues }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.missing?.length) {
          setTemplateError('Заполните: ' + (data.missing as string[]).join(', '))
        } else {
          setTemplateError(data.error || 'Не удалось применить шаблон')
        }
        return
      }
      // Update form state from returned petition
      if (data.title) setTitle(data.title)
      if (data.recipient !== undefined) setRecipient(data.recipient ?? '')
      if (data.draftText !== undefined) setDraftText(data.draftText)
      setTemplatePanelOpen(false)
    } finally {
      setApplyLoading(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) ?? null

  async function openIndividualTemplatesPanel() {
    if (individualTemplatesPanelOpen) {
      setIndividualTemplatesPanelOpen(false)
      return
    }
    if (individualTemplates.length === 0) {
      setIndividualTemplatesLoading(true)
      try {
        const res = await fetch('/api/documents/templates')
        if (res.ok) {
          const data = await res.json() as { items: IndividualTemplate[] }
          setIndividualTemplates(data.items ?? [])
        }
      } finally {
        setIndividualTemplatesLoading(false)
      }
    }
    setIndividualTemplatesPanelOpen(true)
  }

  function toggleAppendixTemplate(id: string) {
    setAppendixTemplateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setAppendixSaveSuccess(false)
  }

  async function saveAppendixTemplates() {
    setAppendixSaveLoading(true)
    setAppendixSaveError('')
    setAppendixSaveSuccess(false)
    try {
      const res = await fetch(`/api/petitions/${petition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appendixTemplateIds }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setAppendixSaveError(d.error ?? 'Не удалось сохранить')
        return
      }
      setAppendixSaveSuccess(true)
    } finally {
      setAppendixSaveLoading(false)
    }
  }

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

      {/* Apply-template panel */}
      <div style={{ marginBottom: '16px' }}>
        <Button type="button" variant="secondary" size="sm" onClick={openTemplatePanel} loading={templatePanelLoading}>
          {templatePanelOpen ? 'Закрыть шаблон' : 'Применить шаблон'}
        </Button>

        {templatePanelOpen && (
          <div style={{ marginTop: '12px', background: 'var(--white)', borderRadius: '6px', border: '1px solid var(--border)', borderLeft: '4px solid var(--sky, #4EA8DE)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                📋 Применить шаблон коллективного заявления
              </span>
            </div>

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {templates.length === 0 ? (
                <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>
                  Нет доступных шаблонов коллективных заявлений.
                </p>
              ) : (
                <label>
                  <span style={labelStyle}>Шаблон</span>
                  <select
                    value={selectedTemplateId}
                    onChange={e => handleTemplateSelect(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">— выберите шаблон —</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </label>
              )}

              {selectedTemplate && selectedTemplate.variables.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedTemplate.variables.map(v => (
                    <label key={v.name}>
                      <span style={labelStyle}>
                        {v.label}
                        {v.required && <span style={{ color: '#DC2626', marginLeft: '2px' }}>*</span>}
                        {v.source === 'profile' && (
                          <span style={{ marginLeft: '6px', fontStyle: 'normal', opacity: 0.6 }}>(из профиля)</span>
                        )}
                      </span>
                      {v.type === 'multiline' ? (
                        <textarea
                          value={fieldValues[v.name] ?? ''}
                          onChange={e => setFieldValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                          rows={4}
                          style={{ ...inputStyle, lineHeight: 1.7, resize: 'vertical' }}
                        />
                      ) : v.type === 'select' && v.options ? (
                        <select
                          value={fieldValues[v.name] ?? ''}
                          onChange={e => setFieldValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                          style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                          <option value="">— выберите —</option>
                          {v.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={v.type === 'date' ? 'date' : 'text'}
                          value={fieldValues[v.name] ?? ''}
                          onChange={e => setFieldValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                          style={inputStyle}
                        />
                      )}
                    </label>
                  ))}
                </div>
              )}

              {templateError && (
                <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: 0 }}>
                  {templateError}
                </p>
              )}

              {selectedTemplateId && (
                <div style={{ paddingTop: '4px' }}>
                  <Button type="button" variant="primary" size="sm" onClick={applyTemplate} loading={applyLoading}>
                    {applyLoading ? 'Применяем...' : 'Применить'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Appendix templates panel */}
      <div style={{ marginBottom: '16px' }}>
        <Button type="button" variant="secondary" size="sm" onClick={openIndividualTemplatesPanel} loading={individualTemplatesLoading}>
          {individualTemplatesPanelOpen ? 'Закрыть приложения' : 'Настроить приложения участников'}
        </Button>

        {individualTemplatesPanelOpen && (
          <div style={{ marginTop: '12px', background: 'var(--white)', borderRadius: '6px', border: '1px solid var(--border)', borderLeft: '4px solid var(--sky, #4EA8DE)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                Приложения к заявлению (для участников)
              </span>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {individualTemplates.length === 0 ? (
                <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>
                  Нет доступных индивидуальных шаблонов.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {individualTemplates.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={appendixTemplateIds.includes(t.id)}
                        onChange={() => toggleAppendixTemplate(t.id)}
                        style={{ flexShrink: 0 }}
                      />
                      <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink)' }}>
                        {t.title}
                        {t.category && (
                          <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--ink-soft)' }}>({t.category})</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {appendixSaveError && (
                <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: 0 }}>
                  {appendixSaveError}
                </p>
              )}
              {appendixSaveSuccess && (
                <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#065F46', margin: 0 }}>
                  Сохранено.
                </p>
              )}
              <div style={{ paddingTop: '4px' }}>
                <Button type="button" variant="primary" size="sm" onClick={saveAppendixTemplates} loading={appendixSaveLoading}>
                  {appendixSaveLoading ? 'Сохраняем...' : 'Сохранить приложения'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

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
