'use client'
import { useState } from 'react'

type Props = {
  membershipId: string
  orgName: string
  apartmentNumber: string | null
  buildingAddress: string | null
  currentAreaSqm: number | null
  lastDeclaredAt: string | null
}

export function OwnershipDeclareCard({
  membershipId, orgName, apartmentNumber, buildingAddress,
  currentAreaSqm, lastDeclaredAt,
}: Props) {
  const [step, setStep] = useState<'idle' | 'otp'>('idle')
  const [revoking, setRevoking] = useState(false)
  const [revoked, setRevoked] = useState(false)
  const [areaSqm, setAreaSqm] = useState(currentAreaSqm?.toString() ?? '')
  const [sharePercent, setSharePercent] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const declaredText = `Я подтверждаю, что указанные параметры собственности (площадь${areaSqm ? ` ${areaSqm} м²` : ''}${sharePercent ? `, доля ${sharePercent}%` : ''}) по объекту "${orgName}${apartmentNumber ? `, кв. ${apartmentNumber}` : ''}" я смогу подтвердить правоустанавливающими документами при необходимости.`

  async function request() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/profile/ownership/declare-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId }),
      })
      const d = await res.json() as { error?: string }
      if (!res.ok) {
        setError(d.error === 'phone_not_verified'
          ? 'Сначала подтвердите телефон в профиле'
          : (d.error || 'Не удалось отправить код'))
        return
      }
      setStep('otp')
    } finally { setLoading(false) }
  }

  async function revoke() {
    if (!window.confirm('Отозвать декларацию собственности?\n\nВаш голос в голосованиях больше не будет учитываться по площади.')) return
    setRevoking(true); setError('')
    try {
      const res = await fetch('/api/profile/ownership/declare-revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId }),
      })
      const d = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !d.ok) { setError(d.error || 'Ошибка отзыва'); return }
      setRevoked(true); setSuccess(null)
    } finally { setRevoking(false) }
  }

  async function verify() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/profile/ownership/declare-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId,
          otp: otp.trim(),
          declaredText,
          areaSqm: areaSqm.trim() ? Number(areaSqm) : undefined,
          sharePercent: sharePercent.trim() ? Number(sharePercent) : undefined,
        }),
      })
      const d = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !d.ok) {
        setError(d.error || 'Не удалось подтвердить')
        return
      }
      setSuccess(new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-ink">{orgName}</h3>
          <p className="text-sm text-ink/60 mt-0.5">
            {apartmentNumber && `кв. ${apartmentNumber}`}
            {buildingAddress && ` · ${buildingAddress}`}
          </p>
        </div>
        {(success || lastDeclaredAt) && (
          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-forest/10 text-forest shrink-0">
            ✓ Подписано
          </span>
        )}
      </div>

      {!revoked && (success || lastDeclaredAt) ? (
        <>
          <p className="text-xs text-ink/50 mb-3">
            Декларация подписана {success ?? new Date(lastDeclaredAt!).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
          <button onClick={revoke} disabled={revoking}
            className="text-xs text-ink/40 hover:text-red-500 underline underline-offset-2 transition-colors disabled:opacity-50">
            {revoking ? 'Отзываем...' : 'Отозвать подпись'}
          </button>
        </>
      ) : step === 'idle' ? (
        <>
          <p className="text-sm text-ink/70 mb-3">
            Чтобы голос засчитывался по доле собственности, подтвердите параметры через SMS.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Площадь, м²</span>
              <input type="number" step="0.1" min="0" value={areaSqm}
                onChange={e => setAreaSqm(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Доля, % (опц.)</span>
              <input type="number" step="0.01" min="0" max="100" value={sharePercent}
                onChange={e => setSharePercent(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
            </label>
          </div>
          <div className="mb-3">
            <p className="text-xs font-medium text-ink/70 uppercase tracking-wider mb-1.5">Текст декларации</p>
            <p className="text-xs text-ink/70 p-3 bg-cream rounded-lg leading-relaxed">{declaredText}</p>
          </div>
          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
          <button onClick={request} disabled={loading || !areaSqm.trim()}
            className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {loading ? 'Отправляем код...' : 'Подписать через SMS'}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink/70 mb-3">Введите код из SMS</p>
          <input type="text" inputMode="numeric" value={otp}
            onChange={e => setOtp(e.target.value)} placeholder="6 цифр"
            className="w-full px-3 py-2 border border-border rounded-xl text-base text-center tracking-widest mb-3" />
          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setStep('idle'); setError(''); setOtp('') }}
              className="px-3 py-2 border border-border rounded-xl text-sm">
              ← Назад
            </button>
            <button onClick={verify} disabled={loading || !otp.trim()}
              className="flex-1 px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {loading ? 'Проверяем...' : 'Подтвердить'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
