'use client'
import Link from 'next/link'

interface Props {
  hasName: boolean
  hasPhone: boolean
  hasAddress: boolean
}

export function OnboardingBanner({ hasName, hasPhone, hasAddress }: Props) {
  if (hasName && hasPhone && hasAddress) return null

  const tasks = [
    { done: hasName,    label: 'Укажите имя / ФИО' },
    { done: hasPhone,   label: 'Подтвердите номер телефона' },
    { done: hasAddress, label: 'Укажите адрес / квартиру' },
  ]

  const doneCount = tasks.filter(t => t.done).length

  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderLeft: '4px solid var(--amber)',
      borderRadius: '12px',
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2L9 10M9 13L9 14" stroke="#E8A020" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="9" cy="9" r="8" stroke="#E8A020" strokeWidth="1.5"/>
          </svg>
          <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Заполните профиль
          </p>
          <span style={{ fontSize: '11px', color: 'var(--ink-soft)', background: 'var(--cream)', padding: '2px 8px', borderRadius: '20px' }}>
            {doneCount} / {tasks.length}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
          {tasks.map(({ done, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '5px',
                border: done ? 'none' : '1.5px solid var(--border)',
                background: done ? 'var(--forest)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <p style={{ fontSize: '13px', color: done ? 'var(--ink-soft)' : 'var(--ink)', textDecoration: done ? 'line-through' : 'none', margin: 0 }}>
                {label}
              </p>
            </div>
          ))}
        </div>
        <Link
          href="/profile"
          style={{
            display: 'inline-block',
            background: 'var(--forest)',
            color: 'white',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: 'Golos Text, sans-serif',
          }}
        >
          Заполнить профиль →
        </Link>
      </div>
    </div>
  )
}
