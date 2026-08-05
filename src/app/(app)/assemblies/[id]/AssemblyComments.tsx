'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, MessageSquare } from 'lucide-react'

type Comment = { id: string; text: string; createdAt: string; user: { id: string; name: string | null; email: string | null } }

function fmt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function AssemblyComments({ assemblyId, currentUserId }: { assemblyId: string; currentUserId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const lastIso = useRef<string>(new Date(0).toISOString())

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/assemblies/${assemblyId}/comments`)
      if (!r.ok) return
      const d = await r.json() as { comments: Comment[] }
      setComments(d.comments)
      if (d.comments.length) lastIso.current = d.comments[d.comments.length - 1].createdAt
    } catch {}
  }, [assemblyId])

  useEffect(() => {
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true); setError('')
    try {
      const r = await fetch(`/api/assemblies/${assemblyId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Не удалось отправить'); return }
      const { comment } = await r.json() as { comment: Comment }
      setComments(prev => [...prev, comment])
      setText('')
    } finally { setSending(false) }
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
        <MessageSquare size={16} className="text-forest" /> Обсуждение
      </h3>

      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
        {comments.length === 0 && <p className="text-sm text-ink/50">Комментариев пока нет.</p>}
        {comments.map(c => {
          const isMe = c.user.id === currentUserId
          return (
            <div key={c.id} className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-ink">{isMe ? 'Вы' : (c.user.name || c.user.email || 'Участник')}</span>
                <span className="text-[10px] text-ink/40">{fmt(c.createdAt)}</span>
              </div>
              <p className="text-sm text-ink/80 whitespace-pre-wrap break-words">{c.text}</p>
            </div>
          )
        })}
      </div>

      <form onSubmit={send} className="flex items-end gap-2">
        <textarea value={text} onChange={e => setText(e.target.value)} rows={1}
          placeholder="Написать комментарий..."
          className="flex-1 resize-none border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-forest"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as unknown as React.FormEvent) } }}
        />
        <button type="submit" disabled={sending || !text.trim()}
          className="w-10 h-10 rounded-xl bg-forest text-white flex items-center justify-center disabled:opacity-30">
          <Send size={16} />
        </button>
      </form>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  )
}
