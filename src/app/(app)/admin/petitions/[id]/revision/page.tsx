'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function RevisionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [revision, setRevision] = useState<{ id: string; aiSuggestion: string; aiSummary: string } | null>(null)
  const [finalText, setFinalText] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  async function runAI() {
    setAiLoading(true)
    setError('')
    const res = await fetch(`/api/petitions/${id}/revise`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json() as { id: string; aiSuggestion: string; aiSummary: string }
      setRevision(data)
      setFinalText(data.aiSuggestion)
    } else {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Ошибка AI-ревизии')
    }
    setAiLoading(false)
  }

  async function approve() {
    if (!revision) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/petitions/${id}/revise`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalText, revisionId: revision.id }),
    })
    if (res.ok) {
      await fetch(`/api/petitions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SIGNING' }),
      })
      router.push(`/admin/petitions/${id}/signing`)
    } else {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Ошибка сохранения')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <h1 className="text-xl font-semibold">AI-ревизия текста</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!revision && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
          <p className="text-gray-600">DeepSeek Pro проанализирует все комментарии и предложит улучшенный текст заявления.</p>
          <Button onClick={runAI} disabled={aiLoading} className="w-full">
            {aiLoading ? 'Анализируем комментарии...' : 'Запустить AI-ревизию'}
          </Button>
        </div>
      )}

      {revision && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-800 mb-1">Что изменил AI:</p>
            <p className="text-sm text-blue-700">{revision.aiSummary}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Финальный текст (отредактируй при необходимости)
            </label>
            <textarea
              value={finalText}
              onChange={e => setFinalText(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm h-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={runAI} disabled={aiLoading}>
              Запустить AI заново
            </Button>
            <Button onClick={approve} disabled={loading || !finalText.trim()}>
              {loading ? 'Сохраняем...' : 'Утвердить и открыть подписание →'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
