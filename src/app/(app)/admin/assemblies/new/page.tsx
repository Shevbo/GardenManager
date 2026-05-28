'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'

type Question = { text: string; description: string; requiredMajorityPct: number }

export default function NewAssemblyPage() {
  const router = useRouter()
  const [orgId, setOrgId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'online' | 'async_collect'>('async_collect')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [quorumPercent, setQuorumPercent] = useState(50)
  const [questions, setQuestions] = useState<Question[]>([{ text: '', description: '', requiredMajorityPct: 50 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then((d: { orgId?: string }) => {
      if (d.orgId) setOrgId(d.orgId)
    }).catch(() => {})
  }, [])

  function updateQ(i: number, patch: Partial<Question>) {
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q))
  }

  function addQuestion() {
    setQuestions(qs => [...qs, { text: '', description: '', requiredMajorityPct: 50 }])
  }

  function removeQuestion(i: number) {
    setQuestions(qs => qs.length > 1 ? qs.filter((_, idx) => idx !== i) : qs)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) { setError('Организация не найдена'); return }
    if (questions.some(q => !q.text.trim())) {
      setError('Заполните текст каждого вопроса'); return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/assemblies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId, title, description, type,
          startsAt, endsAt,
          quorumPercent,
          questions: questions.map(q => ({
            text: q.text.trim(),
            description: q.description.trim() || undefined,
            requiredMajorityPct: q.requiredMajorityPct,
          })),
        }),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok || !data.id) {
        setError(data.error || 'Ошибка создания')
        return
      }
      router.push(`/assemblies/${data.id}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="p-8 max-w-3xl overflow-y-auto flex-1">
      <Link href="/assemblies" className="text-sm text-forest hover:underline">
        ← К списку собраний
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mt-3 mb-6">Новое общее собрание</h1>

      <form onSubmit={submit} className="space-y-6">
        <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-bold">Основные данные</h2>

          <label className="block">
            <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Заголовок</span>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Например: Ремонт кровли дома №12"
              className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Описание (повестка)</span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Краткая повестка собрания"
              className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Форма</span>
              <select value={type} onChange={e => setType(e.target.value as 'online' | 'async_collect')}
                className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm bg-white">
                <option value="async_collect">Заочное (сбор бюллетеней)</option>
                <option value="online">Очное / онлайн</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Кворум, %</span>
              <input type="number" min={1} max={100} value={quorumPercent}
                onChange={e => setQuorumPercent(Number(e.target.value))}
                className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Начало</span>
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required
                className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Окончание</span>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} required
                className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
            </label>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold">Вопросы повестки</h2>
            <button type="button" onClick={addQuestion}
              className="inline-flex items-center gap-1 text-sm text-forest hover:underline">
              <Plus size={14} /> Добавить вопрос
            </button>
          </div>
          {questions.map((q, i) => (
            <div key={i} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-ink/50 mt-2.5 shrink-0">#{i + 1}</span>
                <div className="flex-1 space-y-2">
                  <input type="text" value={q.text} onChange={e => updateQ(i, { text: e.target.value })} required
                    placeholder="Формулировка вопроса (на голосование 'за/против/воздержался')"
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
                  <textarea value={q.description} onChange={e => updateQ(i, { description: e.target.value })} rows={2}
                    placeholder="Пояснение (необязательно)"
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
                  <label className="block">
                    <span className="text-xs text-ink/60">Требуемое большинство, %</span>
                    <select value={q.requiredMajorityPct}
                      onChange={e => updateQ(i, { requiredMajorityPct: Number(e.target.value) })}
                      className="ml-2 px-2 py-1 border border-border rounded text-xs bg-white">
                      <option value={50}>50% + 1 (простое большинство)</option>
                      <option value={66.7}>⅔ (квалифицированное)</option>
                      <option value={75}>75%</option>
                      <option value={100}>100% (единогласно)</option>
                    </select>
                  </label>
                </div>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(i)}
                    className="text-ink/30 hover:text-red-500 p-1">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="px-5 py-2.5 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {loading ? 'Создаём...' : 'Создать черновик'}
          </button>
          <Link href="/assemblies"
            className="px-5 py-2.5 border border-border rounded-xl text-sm">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  )
}
