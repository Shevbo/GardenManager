'use client'
import { useState } from 'react'

interface Props {
  onAccept: () => void
  loading: boolean
}

export function LegalDisclaimer({ onAccept, loading }: Props) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Legal text block */}
      <div style={{
        background: 'var(--white)',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--amber)',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(10,61,46,0.05)',
      }}>
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border)',
          background: '#FFFBF0',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: '#B45309' }}>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
            <line x1="7" y1="4.5" x2="7" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="9.5" r="0.75" fill="currentColor" />
          </svg>
          <span style={{
            fontFamily: 'Unbounded, sans-serif',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: '#92400E',
          }}>
            Юридически значимое действие
          </span>
        </div>
        <div style={{ padding: '20px 20px', fontFamily: 'Golos Text, sans-serif', fontSize: '14px', lineHeight: '1.75', color: 'var(--ink-mid)' }}>
          <p style={{ margin: '0 0 12px' }}>
            Подписывая данное заявление, я подтверждаю своё согласие с его текстом.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            Простая электронная подпись с подтверждением одноразовым кодом из СМС имеет юридическую силу и{' '}
            <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>эквивалентна собственноручной подписи</strong>{' '}
            на заявлении, направляемом в государственные органы.
          </p>
          <p style={{ margin: 0 }}>
            Я осознаю юридические последствия данного действия.
          </p>
        </div>
      </div>

      {/* Consent checkbox */}
      <label style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        cursor: 'pointer',
        background: agreed ? '#EDFAF3' : 'var(--white)',
        borderRadius: '12px',
        border: `1px solid ${agreed ? '#7ECFA4' : 'var(--border)'}`,
        padding: '16px 18px',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '6px',
          border: `2px solid ${agreed ? 'var(--forest)' : 'var(--border)'}`,
          background: agreed ? 'var(--forest)' : 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '1px',
          transition: 'all 0.15s',
        }}>
          {agreed && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4.5L4 7.5L10 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
        </div>
        <span style={{
          fontFamily: 'Golos Text, sans-serif',
          fontSize: '14px',
          color: agreed ? 'var(--ink)' : 'var(--ink-mid)',
          lineHeight: 1.6,
          transition: 'color 0.2s',
        }}>
          Я прочитал(а) условия и принимаю их. Понимаю юридические последствия подписания.
        </span>
      </label>

      {/* Action button */}
      <button
        onClick={onAccept}
        disabled={!agreed || loading}
        style={{
          width: '100%',
          padding: '16px 24px',
          borderRadius: '12px',
          border: 'none',
          background: !agreed || loading ? 'var(--cream-dark)' : 'var(--forest)',
          color: !agreed || loading ? 'var(--ink-soft)' : 'var(--white)',
          fontFamily: 'Unbounded, sans-serif',
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          cursor: !agreed || loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s, color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: '16px', height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.7s linear infinite',
            }} />
            Подписываем...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 8L9.5 11L13 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Подписать заявление
          </>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
