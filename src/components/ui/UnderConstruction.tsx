import Link from 'next/link'
import { Construction } from 'lucide-react'

/** Friendly "section in development" placeholder for not-yet-released features. */
export function UnderConstruction({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ maxWidth: '460px', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', margin: '0 auto 20px', borderRadius: '20px', background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Construction size={36} style={{ color: 'var(--amber)' }} />
        </div>
        <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          {title} — в разработке
        </h1>
        <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '15px', lineHeight: 1.6, color: 'var(--ink-soft)', margin: '0 0 24px' }}>
          {description ?? 'Этот раздел скоро появится — мы уже работаем над ним. Спасибо за терпение!'}
        </p>
        <Link href="/dashboard"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'Golos Text, sans-serif', fontSize: '14px', fontWeight: 500, color: 'white', background: 'var(--forest)', padding: '10px 18px', borderRadius: '12px', textDecoration: 'none' }}>
          ← На главную
        </Link>
      </div>
    </div>
  )
}
