'use client'
import { useState, useEffect } from 'react'

interface Props {
  initialName: string | null
  initialAddress: string | null
  initialPhone: string | null
  phoneVerified: boolean
}

export function ProfileForm({ initialName, initialAddress, initialPhone, phoneVerified }: Props) {
  const [name, setName] = useState(initialName ?? '')
  const [address, setAddress] = useState(initialAddress ?? '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Phone verification state
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input')
  const [isPhoneVerified, setIsPhoneVerified] = useState(phoneVerified)
  const [otp, setOtp] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [phoneMsg, setPhoneMsg] = useState('')
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), address: address.trim() }),
      })
      if (res.ok) setSaveMsg('Сохранено')
      else setSaveMsg('Ошибка сохранения')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  async function handleSendPhoneOtp() {
    setPhoneError('')
    setPhoneLoading(true)
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setPhoneError(data.error ?? 'Ошибка'); return }
      setPhoneStep('otp')
      setCountdown(60)
    } finally {
      setPhoneLoading(false)
    }
  }

  async function handleVerifyPhone(e: React.FormEvent) {
    e.preventDefault()
    setPhoneError('')
    setPhoneLoading(true)
    try {
      const res = await fetch('/api/profile/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })
      const data = await res.json() as { error?: string; ok?: boolean }
      if (!res.ok) { setPhoneError(data.error ?? 'Неверный код'); return }
      setIsPhoneVerified(true)
      setPhoneStep('input')
      setPhoneMsg('Телефон подтверждён')
    } finally {
      setPhoneLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'Golos Text, sans-serif',
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box' as const,
    background: 'white',
  }

  const btnPrimary = (disabled?: boolean) => ({
    background: disabled ? '#6B6B63' : 'var(--forest)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600 as const,
    cursor: disabled ? 'not-allowed' as const : 'pointer' as const,
    fontFamily: 'Golos Text, sans-serif',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '520px' }}>

      {/* Name + Address */}
      <section style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px' }}>
        <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 20px' }}>
          Личные данные
        </h2>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--ink-soft)', display: 'block', marginBottom: '6px' }}>Имя / ФИО</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--ink-soft)', display: 'block', marginBottom: '6px' }}>Адрес / квартира</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="ул. Садовая 12, кв. 47"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="submit" disabled={saving} style={btnPrimary(saving)}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
            {saveMsg && <p style={{ fontSize: '13px', color: 'var(--forest)', margin: 0 }}>{saveMsg}</p>}
          </div>
        </form>
      </section>

      {/* Phone */}
      <section style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
            Телефон
          </h2>
          {isPhoneVerified && (
            <span style={{ fontSize: '12px', color: 'var(--forest)', fontWeight: 600, background: '#E8F5E9', padding: '3px 10px', borderRadius: '20px' }}>
              ✓ Подтверждён
            </span>
          )}
        </div>

        {phoneStep === 'input' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--ink-soft)', display: 'block', marginBottom: '6px' }}>Номер телефона</label>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setIsPhoneVerified(false) }}
                placeholder="+79991234567"
                style={inputStyle}
              />
            </div>
            {phoneError && <p style={{ fontSize: '13px', color: '#991B1B', margin: 0 }}>{phoneError}</p>}
            {phoneMsg && <p style={{ fontSize: '13px', color: 'var(--forest)', margin: 0 }}>{phoneMsg}</p>}
            {!isPhoneVerified && (
              <button
                type="button"
                onClick={handleSendPhoneOtp}
                disabled={phoneLoading || !phone}
                style={btnPrimary(phoneLoading || !phone)}
              >
                {phoneLoading ? 'Отправляем...' : 'Получить SMS-код'}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleVerifyPhone} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>Код отправлен на {phone}</p>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              style={{ ...inputStyle, fontSize: '24px', letterSpacing: '6px', textAlign: 'center' }}
            />
            {phoneError && <p style={{ fontSize: '13px', color: '#991B1B', margin: 0 }}>{phoneError}</p>}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button type="submit" disabled={phoneLoading} style={btnPrimary(phoneLoading)}>
                {phoneLoading ? 'Проверяем...' : 'Подтвердить'}
              </button>
              {countdown > 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>Повтор через {countdown} сек.</p>
              ) : (
                <button type="button" onClick={handleSendPhoneOtp} style={{ background: 'none', border: 'none', color: 'var(--forest)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Golos Text, sans-serif' }}>
                  Отправить снова
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
