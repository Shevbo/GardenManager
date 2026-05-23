'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function NewPetitionPage() {
  const router = useRouter()
  const [orgId, setOrgId] = useState('')
  const [title, setTitle] = useState('')
  const [draftText, setDraftText] = useState('')
  const [discussionDeadline, setDiscussionDeadline] = useState('')
  const [signingDeadline, setSigningDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then((data: { orgId?: string }) => { if (data.orgId) setOrgId(data.orgId) })
      .catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) { setError('Организация не найдена'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/petitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, title, draftText, discussionDeadline, signingDeadline }),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok || !data.id) {
        setError(data.error ?? 'Ошибка создания')
        return
      }
      const patchRes = await fetch(`/api/petitions/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISCUSSION' }),
      })
      if (!patchRes.ok) {
        const patchData = await patchRes.json() as { error?: string }
        setError(patchData.error ?? 'Ошибка открытия обсуждения')
        return
      }
      router.push(`/admin/petitions/${data.id}/discussion`)
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <h1 className="text-2xl font-semibold mb-6">Новое заявление</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}
      <form onSubmit={submit} className="space-y-5 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Краткое название заявления" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Текст черновика</label>
          <textarea
            value={draftText} onChange={e => setDraftText(e.target.value)} required
            placeholder="Текст коллективного заявления..."
            className="w-full rounded-lg border border-gray-200 p-3 text-sm h-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Срок обсуждения</label>
            <Input type="datetime-local" value={discussionDeadline} onChange={e => setDiscussionDeadline(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Срок подписания</label>
            <Input type="datetime-local" value={signingDeadline} onChange={e => setSigningDeadline(e.target.value)} />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Создаём...' : 'Создать заявление и открыть обсуждение'}
        </Button>
      </form>
    </div>
  )
}
