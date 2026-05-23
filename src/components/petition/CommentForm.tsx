'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export function CommentForm({ petitionId }: { petitionId: string }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    await fetch(`/api/petitions/${petitionId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    setText('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Ваши предложения по тексту заявления..."
        className="w-full rounded-lg border border-gray-200 p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <Button type="submit" disabled={loading} size="sm">
        {loading ? 'Отправляем...' : 'Отправить комментарий'}
      </Button>
    </form>
  )
}
