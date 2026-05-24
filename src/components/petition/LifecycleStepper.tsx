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

export function LifecycleStepper({ status }: { status: PetitionStatus }) {
  const activeIndex = ORDER.indexOf(status)

  return (
    <div style={{
      position: 'sticky',
      top: '48px',
      zIndex: 9,
      background: 'var(--white)',
      borderBottom: '1px solid var(--border)',
      padding: '10px 24px 12px',
    }}>
      <div style={{
        maxWidth: '760px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
      }}>
        {STEPS.map((step, i) => {
          const isDone   = i < activeIndex
          const isActive = i === activeIndex
          const isLast   = i === STEPS.length - 1

          return (
            <div key={step.status} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}>
              {/* connector line */}
              {!isLast && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '50%',
                  width: '100%',
                  height: '2px',
                  background: isDone ? 'var(--forest)' : 'var(--border)',
                  zIndex: 0,
                }} />
              )}

              {/* circle */}
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
                flexShrink: 0,
                position: 'relative',
                zIndex: 1,
                background: isDone ? 'var(--forest)' : isActive ? '#7B6FD4' : 'transparent',
                border: isDone ? 'none' : isActive
                  ? '2px solid #7B6FD4'
                  : '2px solid var(--border)',
                color: isDone || isActive ? 'white' : 'var(--ink-soft)',
                boxShadow: isActive ? '0 0 0 4px rgba(123,111,212,0.18)' : 'none',
                transition: 'all 0.2s',
              }}>
                {isDone ? '✓' : isActive ? '●' : ''}
              </div>

              {/* label */}
              <span style={{
                marginTop: '5px',
                fontSize: '8px',
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: isDone ? 'var(--forest)' : isActive ? '#7B6FD4' : 'var(--ink-soft)',
                textAlign: 'center',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
