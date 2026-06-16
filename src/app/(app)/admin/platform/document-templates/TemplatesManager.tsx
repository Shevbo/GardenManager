'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/dialog'

// ── Types ────────────────────────────────────────────────────────────────────

type VarType = 'text' | 'multiline' | 'date' | 'select'
type VarSource = 'profile' | 'manual'

interface TemplateVariable {
  name: string
  label: string
  type: VarType
  required: boolean
  source: VarSource
}

interface DocumentTemplate {
  id: string
  category: string
  title: string
  description: string
  scope: 'collective' | 'individual'
  layoutKey: 'official-letter' | 'police-statement' | 'explanation'
  bodyTemplate: string | null
  variables: TemplateVariable[]
  isActive: boolean
  createdAt: string
}

interface FormState {
  category: string
  title: string
  description: string
  scope: 'collective' | 'individual'
  layoutKey: 'official-letter' | 'police-statement' | 'explanation'
  bodyTemplate: string
  variables: TemplateVariable[]
  isActive: boolean
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

const SCOPE_LABELS: Record<string, string> = {
  collective: 'Коллективное',
  individual: 'Индивидуальное',
}

const LAYOUT_LABELS: Record<string, string> = {
  'official-letter': 'Официальное письмо',
  'police-statement': 'Заявление в полицию',
  'explanation': 'Объяснительная',
}

// ── Empty form ────────────────────────────────────────────────────────────────

function emptyForm(): FormState {
  return {
    category: '',
    title: '',
    description: '',
    scope: 'collective',
    layoutKey: 'official-letter',
    bodyTemplate: '',
    variables: [],
    isActive: true,
  }
}

function emptyVar(): TemplateVariable {
  return { name: '', label: '', type: 'text', required: false, source: 'manual' }
}

// ── Variables editor ──────────────────────────────────────────────────────────

function VariablesEditor({
  variables,
  onChange,
}: {
  variables: TemplateVariable[]
  onChange: (v: TemplateVariable[]) => void
}) {
  function update(idx: number, patch: Partial<TemplateVariable>) {
    const next = variables.map((v, i) => (i === idx ? { ...v, ...patch } : v))
    onChange(next)
  }

  function remove(idx: number) {
    onChange(variables.filter((_, i) => i !== idx))
  }

  function add() {
    onChange([...variables, emptyVar()])
  }

  const cellInput: React.CSSProperties = { ...inputStyle, fontSize: '12px', padding: '6px 8px' }

  return (
    <div>
      <span style={labelStyle}>Переменные</span>
      {variables.length === 0 && (
        <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', marginBottom: '8px' }}>
          Нет переменных
        </p>
      )}
      {variables.map((v, idx) => (
        <div
          key={idx}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 100px 80px 90px 60px',
            gap: '6px',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <input
            style={cellInput}
            placeholder="имя (name)"
            value={v.name}
            onChange={e => update(idx, { name: e.target.value })}
          />
          <input
            style={cellInput}
            placeholder="метка (label)"
            value={v.label}
            onChange={e => update(idx, { label: e.target.value })}
          />
          <select
            style={{ ...cellInput, cursor: 'pointer' }}
            value={v.type}
            onChange={e => update(idx, { type: e.target.value as VarType })}
          >
            <option value="text">text</option>
            <option value="multiline">multiline</option>
            <option value="date">date</option>
            <option value="select">select</option>
          </select>
          <select
            style={{ ...cellInput, cursor: 'pointer' }}
            value={v.source}
            onChange={e => update(idx, { source: e.target.value as VarSource })}
          >
            <option value="manual">manual</option>
            <option value="profile">profile</option>
          </select>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'Golos Text, sans-serif',
              fontSize: '12px',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={v.required}
              onChange={e => update(idx, { required: e.target.checked })}
            />
            обяз.
          </label>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => remove(idx)}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            удалить
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add}>
        + Добавить переменную
      </Button>
    </div>
  )
}

// ── Template Form ─────────────────────────────────────────────────────────────

function TemplateForm({
  initial,
  editingId,
  onSuccess,
  onCancel,
}: {
  initial: FormState
  editingId: string | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        bodyTemplate: form.layoutKey === 'official-letter' ? form.bodyTemplate || null : null,
      }
      const url = editingId
        ? `/api/admin/platform/document-templates/${editingId}`
        : '/api/admin/platform/document-templates'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setError(d.error ?? 'Ошибка сохранения')
        return
      }
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderLeft: '4px solid var(--forest)',
    borderRadius: '6px',
    marginBottom: '24px',
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

  const cardTitleStyle: React.CSSProperties = {
    fontFamily: 'Unbounded, sans-serif',
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: 'var(--ink-soft)',
  }

  return (
    <form onSubmit={submit} style={cardStyle}>
      <div style={cardHeaderStyle}>
        <span style={cardTitleStyle}>
          {editingId ? 'Редактирование шаблона' : 'Новый шаблон'}
        </span>
      </div>
      <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label>
            <span style={labelStyle}>Категория</span>
            <input
              style={inputStyle}
              type="text"
              value={form.category}
              onChange={e => field('category', e.target.value)}
              placeholder="напр. ЖКХ, Безопасность"
            />
          </label>
          <label>
            <span style={labelStyle}>Заголовок *</span>
            <input
              style={inputStyle}
              type="text"
              required
              value={form.title}
              onChange={e => field('title', e.target.value)}
              placeholder="Название шаблона"
            />
          </label>
        </div>

        <label>
          <span style={labelStyle}>Описание</span>
          <input
            style={inputStyle}
            type="text"
            value={form.description}
            onChange={e => field('description', e.target.value)}
            placeholder="Краткое описание назначения шаблона"
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label>
            <span style={labelStyle}>Область применения</span>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.scope}
              onChange={e => field('scope', e.target.value as FormState['scope'])}
            >
              <option value="collective">Коллективное</option>
              <option value="individual">Индивидуальное</option>
            </select>
          </label>
          <label>
            <span style={labelStyle}>Макет (layout)</span>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.layoutKey}
              onChange={e => field('layoutKey', e.target.value as FormState['layoutKey'])}
            >
              <option value="official-letter">Официальное письмо</option>
              <option value="police-statement">Заявление в полицию</option>
              <option value="explanation">Объяснительная</option>
            </select>
          </label>
        </div>

        {form.layoutKey === 'official-letter' && (
          <label>
            <span style={labelStyle}>Тело шаблона</span>
            <textarea
              style={{ ...inputStyle, lineHeight: 1.7, resize: 'vertical' }}
              rows={8}
              value={form.bodyTemplate}
              onChange={e => field('bodyTemplate', e.target.value)}
              placeholder="Используйте {{имя_переменной}} для подстановки"
            />
            <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink-soft)', marginTop: '4px', display: 'block' }}>
              Используйте {'{{имя_переменной}}'} для подстановки
            </span>
          </label>
        )}

        <VariablesEditor
          variables={form.variables}
          onChange={v => field('variables', v)}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={e => field('isActive', e.target.checked)}
          />
          <span style={{ ...labelStyle, margin: 0 }}>Активен</span>
        </label>

        {error && (
          <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#DC2626', margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
          <Button type="submit" variant="primary" size="sm" loading={saving}>
            {saving ? 'Сохраняем...' : editingId ? 'Сохранить' : 'Создать'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </div>
    </form>
  )
}

// ── Template Card (list item) ─────────────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
  onDeleted,
}: {
  template: DocumentTemplate
  onEdit: () => void
  onDeleted: () => void
}) {
  const confirm = useConfirm()
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function del() {
    if (!(await confirm({ title: 'Удалить шаблон?', message: `«${template.title}»`, confirmLabel: 'Удалить', tone: 'danger' }))) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/admin/platform/document-templates/${template.id}`, { method: 'DELETE' })
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

  const badgeStyle = (bg: string, color: string): React.CSSProperties => ({
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
    marginRight: '6px',
  })

  return (
    <div
      style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '16px 20px',
        marginBottom: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginRight: '8px' }}>
              {template.title}
            </span>
            <span style={badgeStyle(template.scope === 'collective' ? '#E0F2EC' : '#EEF2FF', template.scope === 'collective' ? '#0A5C3E' : '#3730A3')}>
              {SCOPE_LABELS[template.scope]}
            </span>
            <span style={badgeStyle('#F3F4F6', '#374151')}>
              {LAYOUT_LABELS[template.layoutKey] ?? template.layoutKey}
            </span>
            {!template.isActive && (
              <span style={badgeStyle('#FEF3C7', '#92400E')}>Неактивен</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {template.category && (
              <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink-soft)' }}>
                Категория: {template.category}
              </span>
            )}
            <span style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink-soft)' }}>
              Переменных: {template.variables.length}
            </span>
          </div>
          {template.description && (
            <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink-soft)', margin: '6px 0 0' }}>
              {template.description}
            </p>
          )}
          {deleteError && (
            <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: '#DC2626', margin: '6px 0 0' }}>
              {deleteError}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Редактировать
          </Button>
          <Button variant="danger" size="sm" onClick={del} loading={deleting}>
            Удалить
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TemplatesManager() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formInitial, setFormInitial] = useState<FormState>(emptyForm())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/platform/document-templates')
      if (res.ok) {
        const data = await res.json() as { items: DocumentTemplate[] }
        setTemplates(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditingId(null)
    setFormInitial(emptyForm())
    setShowForm(true)
  }

  function openEdit(t: DocumentTemplate) {
    setEditingId(t.id)
    setFormInitial({
      category: t.category,
      title: t.title,
      description: t.description,
      scope: t.scope,
      layoutKey: t.layoutKey,
      bodyTemplate: t.bodyTemplate ?? '',
      variables: t.variables,
      isActive: t.isActive,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  function handleSuccess() {
    closeForm()
    load()
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
        <Link
          href="/admin/platform"
          style={{
            fontFamily: 'Golos Text, sans-serif',
            fontSize: '13px',
            color: 'var(--ink-soft)',
            textDecoration: 'none',
          }}
        >
          ← Управление
        </Link>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px 80px' }}>
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
            Шаблоны документов
          </h1>
          {!showForm && (
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Новый шаблон
            </Button>
          )}
        </div>

        {showForm && (
          <TemplateForm
            initial={formInitial}
            editingId={editingId}
            onSuccess={handleSuccess}
            onCancel={closeForm}
          />
        )}

        {loading ? (
          <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '14px', color: 'var(--ink-soft)' }}>
            Загрузка...
          </p>
        ) : templates.length === 0 ? (
          <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '14px', color: 'var(--ink-soft)' }}>
            Шаблонов нет. Создайте первый.
          </p>
        ) : (
          templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => openEdit(t)}
              onDeleted={load}
            />
          ))
        )}
      </div>
    </div>
  )
}
