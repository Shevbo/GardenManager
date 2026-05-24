'use client'

import { useState } from 'react'

const ALLOWED_EMOJI = ['❤️', '👍', '👎', '😮', '🔥', '🤝', '💪', '🙏', '😱']

function emojiUrl(emoji: string): string {
  const codepoints = [...emoji]
    .map(c => c.codePointAt(0)!.toString(16).padStart(4, '0'))
    .filter(cp => cp !== 'fe0f')
    .join('-')
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`
}

export type Reaction = {
  emoji: string
  count: number
  hasMyReaction: boolean
  users: string[]
}

type Props = {
  entityType: 'petition' | 'comment'
  entityId: string
  petitionId: string
  reactions: Reaction[]
  currentUserId?: string
}

export function EmojiChips({ entityType, entityId, petitionId, reactions: initial, currentUserId }: Props) {
  const [reactions, setReactions] = useState<Reaction[]>(initial)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tooltipEmoji, setTooltipEmoji] = useState<string | null>(null)

  const apiUrl = entityType === 'petition'
    ? `/api/petitions/${petitionId}/reactions`
    : `/api/petitions/${petitionId}/comments/${entityId}/reactions`

  async function toggle(emoji: string) {
    if (!currentUserId) return

    setReactions(prev => {
      const existing = prev.find(r => r.emoji === emoji)
      if (existing) {
        const hadMine = existing.hasMyReaction
        return prev
          .map(r => r.emoji === emoji
            ? { ...r, count: r.count + (hadMine ? -1 : 1), hasMyReaction: !hadMine,
                users: hadMine ? r.users.filter(u => u !== 'Вы') : [...r.users, 'Вы'] }
            : r
          )
          .filter(r => r.count > 0)
      }
      return [...prev, { emoji, count: 1, hasMyReaction: true, users: ['Вы'] }]
    })

    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })

    setPickerOpen(false)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center', position: 'relative' }}>
      {reactions.map(r => (
        <div key={r.emoji} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              toggle(r.emoji)
              setTooltipEmoji(tooltipEmoji === r.emoji ? null : r.emoji)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '4px',
              border: r.hasMyReaction ? '1.5px solid #9B8EE8' : '1px solid var(--border)',
              background: r.hasMyReaction ? '#EDEAFC' : 'var(--white)',
              cursor: currentUserId ? 'pointer' : 'default',
              fontSize: '11px',
              fontFamily: 'Golos Text, sans-serif',
              color: 'var(--ink)',
              transition: 'background 0.1s',
            }}
          >
            <img src={emojiUrl(r.emoji)} alt={r.emoji} width={13} height={13} style={{ display: 'block' }} />
            <span style={{ fontWeight: 600, lineHeight: 1 }}>{r.count}</span>
          </button>

          {tooltipEmoji === r.emoji && r.users.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '6px',
              background: 'var(--ink)',
              color: 'white',
              fontSize: '11px',
              fontFamily: 'Golos Text, sans-serif',
              borderRadius: '4px',
              padding: '5px 9px',
              whiteSpace: 'nowrap',
              zIndex: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              {r.users.join(', ')}
            </div>
          )}
        </div>
      ))}

      {currentUserId && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setPickerOpen(o => !o)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '4px',
              border: '1.5px dashed var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-soft)',
              transition: 'border-color 0.15s',
            }}
          >
            ＋
          </button>

          {pickerOpen && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '6px',
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px',
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              width: '160px',
              zIndex: 20,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
              {ALLOWED_EMOJI.map(e => (
                <button
                  key={e}
                  onClick={() => toggle(e)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e2 => (e2.currentTarget.style.background = 'var(--cream)')}
                  onMouseLeave={e2 => (e2.currentTarget.style.background = 'transparent')}
                >
                  <img src={emojiUrl(e)} alt={e} width={16} height={16} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
