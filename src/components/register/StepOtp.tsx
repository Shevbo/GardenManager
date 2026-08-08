'use client'

type Props = {
  email: string
  otp: string
  password: string
  error: string
  loading: boolean
  onChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onResend: () => void
  onSubmit: () => void
}

export function StepOtp({ email, otp, password, error, loading, onChange, onPasswordChange, onResend, onSubmit }: Props) {
  const passwordTooShort = password.length > 0 && password.length < 8
  const ready = !!otp.trim() && password.length >= 8

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

      {/* Пароль придумывается вместе с кодом (решение Бориса 2026-08-08):
          дальше можно входить и по паролю, и по коду. */}
      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Придумайте пароль</span>
        <input type="password" value={password} autoComplete="new-password" minLength={8}
          onChange={e => onPasswordChange(e.target.value)}
          placeholder="Минимум 8 символов"
          className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
        <span className={`block text-xs mt-1 ${passwordTooShort ? 'text-red-500' : 'text-ink/45'}`}>
          Не короче 8 символов. Этим паролем вы сможете входить на сайт; вход по коду тоже останется.
        </span>
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button type="button" onClick={onSubmit} disabled={!ready || loading}
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
