'use client'

type Props = {
  email: string
  otp: string
  error: string
  loading: boolean
  onChange: (v: string) => void
  onResend: () => void
  onSubmit: () => void
}

export function StepOtp({ email, otp, error, loading, onChange, onResend, onSubmit }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-ink mb-1">Подтвердите email</h2>
        <p className="text-sm text-ink/60">Код отправлен на <strong>{email}</strong></p>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Код подтверждения</span>
        <input type="text" inputMode="numeric" value={otp} autoComplete="one-time-code"
          onChange={e => onChange(e.target.value)}
          placeholder="6 цифр"
          className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-base text-center tracking-widest" />
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button type="button" onClick={onSubmit} disabled={!otp.trim() || loading}
        className="w-full px-4 py-2.5 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
        {loading ? 'Завершаем...' : 'Завершить регистрацию'}
      </button>

      <button type="button" onClick={onResend}
        className="w-full text-sm text-ink/60 hover:text-ink underline">
        Не пришёл код? Отправить заново
      </button>
    </div>
  )
}
