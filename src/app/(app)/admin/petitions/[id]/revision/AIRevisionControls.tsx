'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export function AIRevisionControls({ petitionId }: { petitionId: string }) {
  const router = useRouter()
  const [revision, setRevision] = useState<{ id: string; aiSuggestion: string; aiSummary: string } | null>(null)
  const [finalText, setFinalText] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  async function runAI() {
    setAiLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/petitions/${petitionId}/revise`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json() as { id: string; aiSuggestion: string; aiSummary: string }
        setRevision(data)
        setFinalText(data.aiSuggestion)
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Ошибка AI-ревизии')
      }
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setAiLoading(false)
    }
  }

  async function approve() {
    if (!revision) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/petitions/${petitionId}/revise`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalText, revisionId: revision.id }),
      })
      if (res.ok) {
        const statusRes = await fetch(`/api/petitions/${petitionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SIGNING' }),
        })
        if (!statusRes.ok) {
          const d = await statusRes.json() as { error?: string }
          setError(d.error ?? 'Ошибка перехода к подписанию')
          return
        }
        router.push(`/admin/petitions/${petitionId}/signing`)
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Ошибка сохранения')
      }
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!revision && (
        <Button onClick={runAI} disabled={aiLoading} className="w-full">
          {aiLoading ? 'Анализируем комментарии...' : 'Запустить AI-ревизию'}
        </Button>
      )}

      {revision && (
        <div className="space-y-3">
          <div className="bg-white/60 border border-amber-300 rounded-lg p-3">
            <p className="text-sm font-medium text-amber-900 mb-1">Что изменил AI:</p>
            <p className="text-sm text-amber-900">{revision.aiSummary}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Финальный текст (отредактируй при необходимости)
            </label>
            <textarea
              value={finalText}
              onChange={e => setFinalText(e.target.value)}
              className="w-full rounded-lg border border-amber-300 bg-white p-3 text-sm h-64 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
