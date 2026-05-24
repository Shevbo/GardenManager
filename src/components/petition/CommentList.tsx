'use client'

import { useState } from 'react'
import { EmojiChips } from './EmojiChips'
import type { Reaction } from './EmojiChips'

export type CommentWithReactions = {
  id: string
  userId: string
  text: string
  createdAt: Date | string
  user: { name: string | null; email: string | null }
  reactions: { emoji: string; userId: string; user: { name: string | null } }[]
}

type Props = {
  petitionId: string
  comments: CommentWithReactions[]
  currentUserId?: string
}

function initials(name: string | null, email: string | null): string {
  if (name) return name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (email ?? '?').slice(0, 2).toUpperCase()
}

function groupReactions(
  rawReactions: CommentWithReactions['reactions'],
  currentUserId?: string
): Reaction[] {
  const map = new Map<string, Reaction>()
  for (const r of rawReactions) {
    const existing = map.get(r.emoji)
    const userName = r.user.name ?? r.userId
    if (existing) {
      existing.count++
      existing.users.push(userName)
      if (r.userId === currentUserId) existing.hasMyReaction = true
    } else {
      map.set(r.emoji, {
        emoji: r.emoji,
        count: 1,
        hasMyReaction: r.userId === currentUserId,
        users: [userName],
      })
    }
  }
  return Array.from(map.values())
}

export function CommentList({ petitionId, comments: initial, currentUserId }: Props) {
  const [comments, setComments] = useState<CommentWithReactions[]>(initial)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/petitions/${petitionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      if (res.ok) {
        const comment = await res.json()
        setComments(prev => [...prev, { ...comment, reactions: [] }])
        setText('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <h2 style={{
          fontFamily: 'Unbounded, sans-serif',
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--ink)',
          margin: 0,
        }}>
          Обсуждение
        </h2>
        {comments.length > 0 && (
          <span style={{
            background: 'var(--cream)',
            color: 'var(--ink-soft)',
            fontSize: '11px',
            fontFamily: 'Golos Text, sans-serif',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
          }}>
            {comments.length}
          </span>
        )}
      </div>

      {comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {comments.map(c => (
            <div key={c.id} style={{
              background: 'var(--white)',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              padding: '14px 18px',
              display: 'flex',
              gap: '12px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--forest)',
                color: 'var(--white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {initials(c.user.name, c.user.email)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{
                    fontFamily: 'Golos Text, sans-serif',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--ink)',
                  }}>
                    {c.user.name ?? c.user.email}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--ink-soft)', fontFamily: 'Golos Text, sans-serif' }}>
                    {new Date(c.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  fontFamily: 'Golos Text, sans-serif',
                  color: 'var(--ink-mid)',
                  lineHeight: '1.65',
                }}>
                  {c.text}
                </p>
                <EmojiChips
                  entityType="comment"
                  entityId={c.id}
                  petitionId={petitionId}
                  reactions={groupReactions(c.reactions, currentUserId)}
                  currentUserId={currentUserId}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {currentUserId ? (
        <form onSubmit={submit} style={{ display: 'flex', gap: '8px' }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Напишите комментарий..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              fontFamily: 'Golos Text, sans-serif',
              fontSize: '14px',
              background: 'var(--white)',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            style={{
              padding: '10px 18px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--forest)',
              color: 'white',
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '11px',
              fontWeight: 700,
              cursor: text.trim() && !submitting ? 'pointer' : 'not-allowed',
              opacity: text.trim() && !submitting ? 1 : 0.5,
              letterSpacing: '-0.01em',
              transition: 'opacity 0.15s',
            }}
          >
            Отправить
          </button>
        </form>
      ) : (
        <div style={{
          borderRadius: '6px',
          border: '1px solid var(--border)',
          padding: '14px 18px',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--ink-soft)',
          fontFamily: 'Golos Text, sans-serif',
          background: 'var(--cream)',
        }}>
          <a href="/login" style={{ color: 'var(--forest)', textDecoration: 'none', fontWeight: 600 }}>Войдите</a>
          {' '}чтобы прокомментировать
        </div>
      )}
    </div>
  )
}
