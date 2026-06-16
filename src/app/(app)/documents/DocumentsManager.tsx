'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/dialog'

// ── Types ─────────────────────────────────────────────────────────────────────

type VarType = 'text' | 'multiline' | 'date' | 'select'
type VarSource = 'profile' | 'manual'

interface TemplateVariable {
  name: string
  label: string
  type: VarType
  required: boolean
  source: VarSource
  options?: string[]
}

interface DocumentTemplate {
  id: string
  title: string
  category: string
  variables: TemplateVariable[]
}

interface GeneratedDocument {
  id: string
  title: string
  status: 'draft' | 'signed'
  petitionId: string | null
  fieldValues: Record<string, string>
  createdAt: string
  template: {
    title: string
    layoutKey: string
    scope: string
  }
}

interface PetitionItem {
  id: string
  title: string
  status: string
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
  boxSizing: 'border-box',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  marginBottom: '10px',
}

const cardHeaderStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--cream)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'Unbounded, sans-serif',
  fontSize: '9px',
  fontWeight: 600,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
}

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    fontFamily: 'Unbounded, sans-serif',
    fontSize: '8px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: bg,
    color,
    borderRadius: '4px',
    padding: '2px 7px',
  }
}

// ── Create Document Panel ─────────────────────────────────────────────────────

function CreateDocumentPanel({
  templates,
  loading,
  onCreate,
  onCancel,
}: {
  templates: DocumentTemplate[]
  loading: boolean
  onCreate: (templateId: string) => Promise<void>
  onCancel: () => void
}) {
  const [selectedId, setSelectedId] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (!selectedId) return
    setCreating(true)
    try {
      await onCreate(selectedId)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ ...cardStyle, borderLeft: '4px solid var(--sky, #4EA8DE)', marginBottom: '24px' }}>
      <div style={cardHeaderStyle}>
        <span style={cardTitleStyle}>Создать новый документ</span>
      </div>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '14px', color: 'var(--ink-soft)', margin: 0 }}>
            Загрузка шаблонов...
          </p>
        ) : templates.length === 0 ? (
          <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '14px', color: 'var(--ink-soft)', margin: 0 }}>
            Нет доступных шаблонов.
          </p>
        ) : (
          <label>
            <span style={labelStyle}>Шаблон документа</span>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">— выберите шаблон —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.title}{t.category ? ` (${t.category})` : ''}</option>
              ))}
            </select>
          </label>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="primary"
            size="sm"
            disabled={!selectedId || creating}
            loading={creating}
            onClick={handleCreate}
          >
            {creating ? 'Создаём...' : 'Создать документ'}
          </Button>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Document Editor ───────────────────────────────────────────────────────────

function DocumentEditor({
  doc,
  templateVars,
  onSaved,
  onSigned,
  onClose,
}: {
  doc: GeneratedDocument
  templateVars: TemplateVariable[]
  onSaved: (updated: GeneratedDocument) => void
  onSigned: (updated: GeneratedDocument) => void
  onClose: () => void
}) {
  const isSigned = doc.status === 'signed'
  const [title, setTitle] = useState(doc.title)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(doc.fieldValues ?? {})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [legalConsent, setLegalConsent] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState('')

  function setField(name: string, value: string) {
    setFieldValues(prev => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, fieldValues }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setSaveError(d.error ?? 'Ошибка сохранения')
        return
      }
      const updated = await res.json() as GeneratedDocument
      onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handleSign() {
    if (!legalConsent) return
    setSigning(true)
    setSignError('')
    try {
      const res = await fetch(`/api/documents/${doc.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legalConsent: true }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string; missing?: string[] }
        if (d.missing?.length) {
          setSignError('Заполните: ' + d.missing.join(', '))
        } else {
          setSignError(d.error ?? 'Ошибка подписания')
        }
        return
      }
      const updated = await res.json() as GeneratedDocument
      onSigned(updated)
    } finally {
      setSigning(false)
    }
  }

  function handleExport() {
    window.open(`/api/documents/${doc.id}/export`, '_blank')
  }

  return (
    <div style={{ ...cardStyle, borderLeft: '4px solid var(--forest)', marginBottom: '24px' }}>
      <div style={cardHeaderStyle}>
        <span style={cardTitleStyle}>{isSigned ? 'Просмотр документа' : 'Редактирование документа'}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isSigned && (
            <span style={badgeStyle('#D1FAE5', '#065F46')}>Подписан</span>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} style={{ fontSize: '12px' }}>
            ← Назад к списку
          </Button>
        </div>
      </div>

      <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Title */}
        <label>
          <span style={labelStyle}>Название документа</span>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isSigned}
            style={{ ...inputStyle, opacity: isSigned ? 0.7 : 1 }}
          />
        </label>

        {/* Template variables */}
        {templateVars.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={labelStyle}>Поля документа</span>
            {templateVars.map(v => (
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
                    onChange={e => setField(v.name, e.target.value)}
                    rows={4}
                    disabled={isSigned}
                    style={{ ...inputStyle, lineHeight: 1.7, resize: 'vertical', opacity: isSigned ? 0.7 : 1 }}
                  />
                ) : v.type === 'select' && v.options ? (
                  <select
                    value={fieldValues[v.name] ?? ''}
                    onChange={e => setField(v.name, e.target.value)}
                    disabled={isSigned}
                    style={{ ...inputStyle, cursor: isSigned ? 'not-allowed' : 'pointer', opacity: isSigned ? 0.7 : 1 }}
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
                    onChange={e => setField(v.name, e.target.value)}
                    disabled={isSigned}
                    style={{ ...inputStyle, opacity: isSigned ? 0.7 : 1 }}
                  />
                )}
              </label>
            ))}
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: 0 }}>
            {saveError}
          </p>
        )}

        {/* Action buttons */}
        {!isSigned && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </div>
        )}

        {/* Sign section */}
        {!isSigned && (
          <div style={{
            marginTop: '8px',
            padding: '16px',
            background: 'var(--cream)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <span style={cardTitleStyle}>Подписание (ПЭП)</span>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={legalConsent}
                onChange={e => setLegalConsent(e.target.checked)}
                style={{ marginTop: '2px', flexShrink: 0 }}
              />
              <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5 }}>
                Подтверждаю согласие подписать документ простой электронной подписью (ПЭП) и несу ответственность за достоверность указанных сведений.
              </span>
            </label>
            {signError && (
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: 0 }}>
                {signError}
              </p>
            )}
            <div>
              <Button
                variant="amber"
                size="sm"
                disabled={!legalConsent || signing}
                loading={signing}
                onClick={handleSign}
              >
                {signing ? 'Подписываем...' : 'Подписать (СМС/ПЭП)'}
              </Button>
            </div>
          </div>
        )}

        {/* Export */}
        <div style={{ paddingTop: '4px' }}>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Скачать PDF
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Petition Attach Control ────────────────────────────────────────────────────

function PetitionAttachControl({
  doc,
  petitions,
  onUpdated,
}: {
  doc: GeneratedDocument
  petitions: PetitionItem[]
  onUpdated: (updated: GeneratedDocument) => void
}) {
  const [selectedPetitionId, setSelectedPetitionId] = useState('')
  const [attaching, setAttaching] = useState(false)
  const [attachError, setAttachError] = useState('')

  const attachedPetition = doc.petitionId
    ? petitions.find(p => p.id === doc.petitionId) ?? null
    : null

  async function handleAttach() {
    if (!selectedPetitionId) return
    setAttaching(true)
    setAttachError('')
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petitionId: selectedPetitionId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setAttachError(d.error ?? 'Ошибка прикрепления')
        return
      }
      const updated = await res.json() as GeneratedDocument
      onUpdated(updated)
      setSelectedPetitionId('')
    } finally {
      setAttaching(false)
    }
  }

  async function handleDetach() {
    setAttaching(true)
    setAttachError('')
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petitionId: null }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setAttachError(d.error ?? 'Ошибка открепления')
        return
      }
      const updated = await res.json() as GeneratedDocument
      onUpdated(updated)
    } finally {
      setAttaching(false)
    }
  }

  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        padding: '10px 20px',
        background: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
      onClick={e => e.stopPropagation()}
    >
      <span style={{
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '8px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--ink-soft)',
      }}>
        Заявление
      </span>

      {attachedPetition ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink)' }}>
            Прикреплено к: <strong>{attachedPetition.title}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            loading={attaching}
            onClick={handleDetach}
            style={{ fontSize: '11px' }}
          >
            Открепить
          </Button>
        </div>
      ) : petitions.length === 0 ? (
        <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink-soft)' }}>
          Нет доступных заявлений для прикрепления.
        </span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedPetitionId}
            onChange={e => setSelectedPetitionId(e.target.value)}
            style={{
              fontFamily: 'Golos Text, sans-serif',
              fontSize: '12px',
              color: 'var(--ink)',
              padding: '5px 8px',
              border: '1px solid var(--border)',
              borderRadius: '5px',
              background: 'var(--white)',
              cursor: 'pointer',
              minWidth: '180px',
              maxWidth: '280px',
            }}
          >
            <option value="">— выберите заявление —</option>
            {petitions.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedPetitionId || attaching}
            loading={attaching}
            onClick={handleAttach}
            style={{ fontSize: '11px' }}
          >
            Привязать
          </Button>
        </div>
      )}

      {attachError && (
        <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: '#DC2626', margin: 0 }}>
          {attachError}
        </p>
      )}
    </div>
  )
}

// ── Document Card (list item) ─────────────────────────────────────────────────

function DocumentCard({
  doc,
  petitions,
  onOpen,
  onDeleted,
  onUpdated,
}: {
  doc: GeneratedDocument
  petitions: PetitionItem[]
  onOpen: () => void
  onDeleted: () => void
  onUpdated: (updated: GeneratedDocument) => void
}) {
  const confirm = useConfirm()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete() {
    if (!(await confirm({ title: 'Удалить документ?', message: `«${doc.title}»`, confirmLabel: 'Удалить', tone: 'danger' }))) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDeleted()
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setDeleteError(d.error ?? 'Ошибка удаления')
      }
    } finally {
      setDeleting(false)
    }
  }

  const isSigned = doc.status === 'signed'

  return (
    <div
      style={{
        ...cardStyle,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
      }}
      onClick={onOpen}
    >
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
                {doc.title}
              </span>
              <span style={isSigned ? badgeStyle('#D1FAE5', '#065F46') : badgeStyle('#FEF3C7', '#92400E')}>
                {isSigned ? 'Подписан' : 'Черновик'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink-soft)' }}>
                {doc.template.title}
              </span>
              <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink-soft)' }}>
                {new Date(doc.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {deleteError && (
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: '#DC2626', margin: '6px 0 0' }}>
                {deleteError}
              </p>
            )}
          </div>
          <div
            style={{ display: 'flex', gap: '8px', flexShrink: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <Button variant="secondary" size="sm" onClick={onOpen}>
              Открыть
            </Button>
            {!isSigned && (
              <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
                Удалить
              </Button>
            )}
          </div>
        </div>
      </div>

      <PetitionAttachControl
        doc={doc}
        petitions={petitions}
        onUpdated={onUpdated}
      />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DocumentsManager() {
  const [docs, setDocs] = useState<GeneratedDocument[]>([])
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [petitions, setPetitions] = useState<PetitionItem[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [openDocId, setOpenDocId] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    if (templates.length > 0) return
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/documents/templates')
      if (res.ok) {
        const data = await res.json() as { items: DocumentTemplate[] }
        setTemplates(data.items ?? [])
      }
    } finally {
      setLoadingTemplates(false)
    }
  }, [templates.length])

  // Load docs and petitions on mount
  useEffect(() => {
    let cancelled = false
    async function fetchDocs() {
      setLoadingDocs(true)
      try {
        const res = await fetch('/api/documents')
        if (res.ok && !cancelled) {
          const data = await res.json() as { items: GeneratedDocument[] }
          setDocs(data.items ?? [])
        }
      } finally {
        if (!cancelled) setLoadingDocs(false)
      }
    }
    async function fetchPetitions() {
      try {
        const res = await fetch('/api/documents/petitions')
        if (res.ok && !cancelled) {
          const data = await res.json() as { items: PetitionItem[] }
          setPetitions(data.items ?? [])
        }
      } catch {
        // petitions list is best-effort; silently ignore errors
      }
    }
    void fetchDocs()
    void fetchPetitions()
    return () => { cancelled = true }
  }, [])

  async function handleOpenCreate() {
    setShowCreatePanel(true)
    await loadTemplates()
  }

  async function handleCreate(templateId: string) {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId }),
    })
    if (!res.ok) return
    const newDoc = await res.json() as GeneratedDocument
    setDocs(prev => [newDoc, ...prev])
    setShowCreatePanel(false)
    setOpenDocId(newDoc.id)
  }

  function handleDocSaved(updated: GeneratedDocument) {
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d))
  }

  function handleDocSigned(updated: GeneratedDocument) {
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d))
  }

  function handleDocDeleted(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id))
    if (openDocId === id) setOpenDocId(null)
  }

  function handleDocUpdated(updated: GeneratedDocument) {
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d))
  }

  const openDoc = openDocId ? docs.find(d => d.id === openDocId) ?? null : null

  // Look up template variables for the open doc
  function getTemplateVars(doc: GeneratedDocument): TemplateVariable[] {
    // We try to find a matching template by title (the doc doesn't carry templateId in listing)
    // But we also need to match — use template title as a hint, and find the first one matching
    const match = templates.find(t => t.title === doc.template.title)
    return match?.variables ?? []
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--cream)' }}>
      {/* Sticky topbar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--white)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {openDoc ? (
          <button
            onClick={() => setOpenDocId(null)}
            style={{
              fontFamily: 'Golos Text, sans-serif',
              fontSize: '13px',
              color: 'var(--ink-soft)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Мои документы
          </button>
        ) : (
          <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Мои документы
          </span>
        )}
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px 80px' }}>
        {openDoc ? (
          // Editor view
          <>
            <DocumentEditor
              doc={openDoc}
              templateVars={getTemplateVars(openDoc)}
              onSaved={handleDocSaved}
              onSigned={handleDocSigned}
              onClose={() => setOpenDocId(null)}
            />
          </>
        ) : (
          // List view
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h1
                style={{
                  fontFamily: 'Unbounded, sans-serif',
                  fontSize: 'clamp(18px, 3vw, 24px)',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Мои документы
              </h1>
              {!showCreatePanel && (
                <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                  + Создать документ
                </Button>
              )}
            </div>

            {showCreatePanel && (
              <CreateDocumentPanel
                templates={templates}
                loading={loadingTemplates}
                onCreate={handleCreate}
                onCancel={() => setShowCreatePanel(false)}
              />
            )}

            {loadingDocs ? (
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '14px', color: 'var(--ink-soft)' }}>
                Загрузка...
              </p>
            ) : docs.length === 0 ? (
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '14px', color: 'var(--ink-soft)' }}>
                У вас пока нет документов. Создайте первый.
              </p>
            ) : (
              docs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  petitions={petitions}
                  onOpen={async () => {
                    // Ensure templates are loaded before opening editor
                    await loadTemplates()
                    setOpenDocId(doc.id)
                  }}
                  onDeleted={() => handleDocDeleted(doc.id)}
                  onUpdated={handleDocUpdated}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
