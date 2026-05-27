'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, Users } from 'lucide-react'

type Msg = {
  id: string
  text: string
  createdAt: string
  user: { id: string; name: string | null; email: string | null }
}

type Props = {
  orgId: string
  orgName: string
  memberCount: number
  currentUserId: string
  initialMessages: Msg[]
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function initials(name: string | null, email: string | null): string {
  if (name) return name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (email ?? '?').slice(0, 2).toUpperCase()
}

export function ChatRoom({ orgId, orgName, memberCount, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastSeenIso = useRef<string>(
    initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].createdAt : new Date(0).toISOString()
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/chats/${orgId}/messages?since=${encodeURIComponent(lastSeenIso.current)}`)
        if (!r.ok) return
        const d = await r.json() as { messages: Msg[] }
        if (d.messages.length > 0) {
          setMessages(prev => [...prev, ...d.messages])
          lastSeenIso.current = d.messages[d.messages.length - 1].createdAt
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      } catch {}
    }, 4000)
    return () => clearInterval(interval)
  }, [orgId])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const r = await fetch(`/api/chats/${orgId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      if (r.ok) {
        const msg = await r.json() as Msg
        setMessages(prev => [...prev, msg])
        lastSeenIso.current = msg.createdAt
        setText('')
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } finally { setSending(false) }
  }

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="border-b border-border bg-white px-5 py-3 flex items-center gap-3">
        <Link href="/chats" className="text-ink/60 hover:text-ink">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-base font-bold text-ink truncate">{orgName}</h1>
          <p className="text-xs text-ink/50 flex items-center gap-1">
            <Users size={11} /> {memberCount} участников
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 bg-[#F7F5F0]">
        {messages.length === 0 ? (
          <div className="text-center text-ink/40 mt-12">
            Сообщений пока нет. Будьте первым!
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((m, i) => {
              const isMe = m.user.id === currentUserId
              const prevSameAuthor = i > 0 && messages[i - 1].user.id === m.user.id
              return (
                <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!prevSameAuthor ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isMe ? 'bg-forest text-white' : 'bg-amber/30 text-ink'
                    }`}>
                      {initials(m.user.name, m.user.email)}
                    </div>
                  ) : <div className="w-8 shrink-0" />}
                  <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!prevSameAuthor && (
                      <span className="text-xs text-ink/50 mb-1 px-1">
                        {m.user.name ?? m.user.email ?? '—'}
                      </span>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2 ${
                      isMe ? 'bg-forest text-white' : 'bg-white border border-border text-ink'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                    </div>
                    <span className="text-[10px] text-ink/40 mt-0.5 px-1">
                      {formatTime(m.createdAt)}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={send} className="border-t border-border bg-white px-5 py-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Написать сообщение..."
          rows={1}
          className="flex-1 resize-none border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-forest"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(e as unknown as React.FormEvent)
            }
          }}
        />
        <button type="submit" disabled={sending || !text.trim()}
          className="w-10 h-10 rounded-xl bg-forest text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
