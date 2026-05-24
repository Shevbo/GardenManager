'use client'

import { useRouter } from 'next/navigation'
import type { PetitionStatus } from '@/lib/petition-status'

const STEPS: { status: PetitionStatus; label: string }[] = [
  { status: 'DRAFT',       label: 'Черновик' },
  { status: 'DISCUSSION',  label: 'Обсуждение' },
  { status: 'AI_REVISION', label: 'AI Ревизия' },
  { status: 'SIGNING',     label: 'Подписание' },
  { status: 'CLOSED',      label: 'Закрыто' },
  { status: 'EXPORTED',    label: 'Готово' },
]

const ORDER = STEPS.map(s => s.status)

type Props = {
  petitionId: string
  currentStatus: PetitionStatus
  isPublic: boolean
}

export function LifecycleStrip({ petitionId, currentStatus, isPublic }: Props) {
  const router = useRouter()
  const activeIndex = ORDER.indexOf(currentStatus)

  async function transitionTo(target: PetitionStatus) {
    const label = STEPS.find(s => s.status === target)?.label ?? target
    if (!window.confirm(`Перевести заявление в статус «${label}»?`)) return

    const res = await fetch(`/api/petitions/${petitionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: target }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Ошибка перехода')
    }
  }

  async function toggleVisibility() {
    const next = !isPublic
    const label = next ? 'публичным' : 'скрытым'
    if (!window.confirm(`Сделать заявление ${label}?`)) return

    const res = await fetch(`/api/petitions/${petitionId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: next }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      alert('Ошибка изменения видимости')
    }
  }

  return (
    <div style={{
      position: 'sticky',
      top: '48px',
      zIndex: 9,
      background: 'var(--white)',
      borderBottom: '1px solid var(--border)',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      flexWrap: 'wrap',
    }}>
      {STEPS.map((step, i) => {
        const isDone   = i < activeIndex
        const isActive = i === activeIndex
        const isNext   = i === activeIndex + 1

        if (!isDone && !isActive && !isNext) return null

        let bg = 'var(--cream)'
        let color = 'var(--ink-soft)'
        let border = '1px solid var(--border)'
        let cursor = 'default'

        if (isDone)   { bg = '#D6F4E5'; color = '#0A3D2E'; border = '1px solid #7ECFA4'; cursor = 'pointer' }
        if (isActive) { bg = '#EDEAFC'; color = '#4B3FBF'; border = '1px solid #9B8EE8' }
        if (isNext)   { bg = '#FEF3C7'; color = '#92400E'; border = '1px solid #D97706'; cursor = 'pointer' }

        return (
          <button
            key={step.status}
            disabled={isActive}
            onClick={() => {
              if (isDone) {
                transitionTo(ORDER[i] as PetitionStatus)
              } else if (isNext) {
                transitionTo(step.status)
              }
            }}
            style={{
              padding: '4px 12px',
              borderRadius: '4px',
              border,
              background: bg,
              color,
              fontSize: '10px',
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor,
              transition: 'opacity 0.15s',
            }}
          >
            {step.label}
          </button>
        )
      })}

      {/* visibility toggle */}
      <button
        onClick={toggleVisibility}
        style={{
          marginLeft: 'auto',
          padding: '4px 12px',
          borderRadius: '4px',
          border: '1px solid var(--border)',
          background: isPublic ? '#D6F4E5' : '#F3F4F6',
          color: isPublic ? '#0A3D2E' : '#374151',
          fontSize: '10px',
          fontFamily: 'Unbounded, sans-serif',
          fontWeight: 600,
          letterSpacing: '0.06em',
          cursor: 'pointer',
        }}
      >
        {isPublic ? '🌐 Публично' : '🔒 Скрыто'}
      </button>
    </div>
  )
}
