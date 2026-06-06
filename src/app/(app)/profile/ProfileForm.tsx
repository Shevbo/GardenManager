'use client'
import { useState, useEffect } from 'react'
import { AddressAutocomplete } from '@/components/address/AddressAutocomplete'

interface Props {
  initialName: string | null
  initialAddress: string | null
  initialPhone: string | null
  phoneVerified: boolean
  initialEmail: string | null
  emailVerified?: boolean
  initialContactDisclosure?: string | null
}

const DISCLOSURE_OPTIONS = [
  { value: 'registry', label: 'Раскрывать в реестре', hint: 'мои контакты можно показывать в реестре подписантов' },
  { value: 'on_request', label: 'Только по отдельному запросу', hint: 'администратор запросит моё согласие перед передачей контактов' },
  { value: 'none', label: 'Не раскрывать', hint: 'мои контакты не передаются' },
]

export function ProfileForm({ initialName, initialAddress, initialPhone, phoneVerified, initialEmail, emailVerified, initialContactDisclosure }: Props) {
  const [name, setName] = useState(initialName ?? '')
  const [address, setAddress] = useState(initialAddress ?? '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(!!emailVerified)
  const [disclosure, setDisclosure] = useState(initialContactDisclosure ?? 'on_request')
  const [savingDisc, setSavingDisc] = useState(false)

  async function saveDisclosure(value: string) {
    const prev = disclosure
    setDisclosure(value)
    setSavingDisc(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactDisclosure: value }),
      })
      if (!res.ok) setDisclosure(prev)
    } catch { setDisclosure(prev) }
    finally { setSavingDisc(false) }
  }

  // Email change state
  const [currentEmail, setCurrentEmail] = useState(initialEmail ?? '')
  const [emailStep, setEmailStep] = useState<'view' | 'input' | 'otp'>('view')
  const [newEmail, setNewEmail] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailCountdown, setEmailCountdown] = useState(0)

  useEffect(() => {
    if (emailCountdown <= 0) return
    const t = setTimeout(() => setEmailCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [emailCountdown])

  async function handleRequestEmailChange(emailArg?: string) {
    const email = (emailArg ?? newEmail).trim()
    setEmailError('')
    setEmailLoading(true)
    try {
      const res = await fetch('/api/profile/change-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await res.json() as { error?: string }
      if (!res.ok) { setEmailError(d.error ?? 'Ошибка'); return }
      setEmailStep('otp')
      setEmailCountdown(60)
    } finally { setEmailLoading(false) }
  }

  async function handleVerifyEmailChange(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setEmailLoading(true)
    try {
      const res = await fetch('/api/profile/change-email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, otp: emailOtp }),
      })
      const d = await res.json() as { error?: string; ok?: boolean }
      if (!res.ok || !d.ok) { setEmailError(d.error ?? 'Неверный код'); return }
      setCurrentEmail(newEmail.toLowerCase())
      setIsEmailVerified(true)
      setEmailStep('view')
      setNewEmail('')
      setEmailOtp('')
    } finally { setEmailLoading(false) }
  }

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
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder="ул. Садовая 12, кв. 47"
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

      {/* Email */}
      <section style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
            Email
          </h2>
          {currentEmail && (isEmailVerified ? (
            <span style={{ fontSize: '12px', color: 'var(--forest)', fontWeight: 600, background: '#E8F5E9', padding: '3px 10px', borderRadius: '20px' }}>
              ✓ Подтверждён
            </span>
          ) : (
            <span style={{ fontSize: '12px', color: '#92400E', fontWeight: 600, background: '#FEF3C7', padding: '3px 10px', borderRadius: '20px' }}>
              Не подтверждён
            </span>
          ))}
        </div>

        {emailStep === 'view' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: 'var(--ink)', fontFamily: 'Golos Text, sans-serif' }}>{currentEmail || '—'}</span>
            {currentEmail && !isEmailVerified && (
              <button type="button" onClick={() => { setNewEmail(currentEmail); setEmailError(''); void handleRequestEmailChange(currentEmail) }}
                style={{ ...btnPrimary(false), padding: '6px 14px', fontSize: '13px' }}>
                Подтвердить email
              </button>
            )}
            <button type="button" onClick={() => { setEmailStep('input'); setNewEmail(currentEmail); setEmailError('') }}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'Golos Text, sans-serif' }}>
              Изменить
            </button>
          </div>
        )}

        {emailStep === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--ink-soft)', display: 'block', marginBottom: '6px' }}>Новый email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="new@example.com" autoFocus style={inputStyle} />
            </div>
            {emailError && <p style={{ fontSize: '13px', color: '#991B1B', margin: 0 }}>{emailError}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => handleRequestEmailChange()}
                disabled={emailLoading || !newEmail.trim() || newEmail.trim().toLowerCase() === currentEmail}
                style={btnPrimary(emailLoading || !newEmail.trim() || newEmail.trim().toLowerCase() === currentEmail)}>
                {emailLoading ? 'Отправляем...' : 'Получить код на email'}
              </button>
              <button type="button" onClick={() => { setEmailStep('view'); setEmailError('') }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 16px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Golos Text, sans-serif' }}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {emailStep === 'otp' && (
          <form onSubmit={handleVerifyEmailChange} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>Код отправлен на {newEmail}</p>
            <input type="text" value={emailOtp}
              onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" inputMode="numeric" autoFocus
              style={{ ...inputStyle, fontSize: '24px', letterSpacing: '6px', textAlign: 'center' }} />
            {emailError && <p style={{ fontSize: '13px', color: '#991B1B', margin: 0 }}>{emailError}</p>}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button type="submit" disabled={emailLoading} style={btnPrimary(emailLoading)}>
                {emailLoading ? 'Проверяем...' : 'Подтвердить'}
              </button>
              {emailCountdown > 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>Повтор через {emailCountdown} сек.</p>
              ) : (
                <button type="button" onClick={() => handleRequestEmailChange()}
                  style={{ background: 'none', border: 'none', color: 'var(--forest)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Golos Text, sans-serif' }}>
                  Отправить снова
                </button>
              )}
              <button type="button" onClick={() => { setEmailStep('input'); setEmailOtp(''); setEmailError('') }}
                style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Golos Text, sans-serif' }}>
                ← Назад
              </button>
            </div>
          </form>
        )}
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

      {/* Contacts disclosure preference */}
      <section style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px' }}>
        <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Контакты в реестре
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Как разрешить использовать ваши контакты для связи в коллективных заявлениях, которые вы подписали.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DISCLOSURE_OPTIONS.map(o => (
            <label key={o.value} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
              border: `1px solid ${disclosure === o.value ? 'var(--forest)' : 'var(--border)'}`,
              background: disclosure === o.value ? '#EDFAF3' : 'white',
              borderRadius: '10px', padding: '12px 14px', transition: 'all 0.15s',
            }}>
              <input
                type="radio"
                name="contactDisclosure"
                checked={disclosure === o.value}
                onChange={() => saveDisclosure(o.value)}
                disabled={savingDisc}
                style={{ marginTop: '2px', accentColor: 'var(--forest)' }}
              />
              <span>
                <span style={{ display: 'block', fontSize: '14px', color: 'var(--ink)', fontWeight: 500 }}>{o.label}</span>
                <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
