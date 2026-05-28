'use client'

type Org = { id: string; name: string } | null

type Props = {
  matched: boolean
  org: Org
  apartmentNumber: string
  areaSqm: string
  fullName: string
  email: string
  error: string
  loading: boolean
  onChange: (patch: { apartmentNumber?: string; areaSqm?: string; fullName?: string; email?: string }) => void
  onBack: () => void
  onSubmit: () => void
}

export function StepDetails({
  matched, org, apartmentNumber, areaSqm, fullName, email,
  error, loading, onChange, onBack, onSubmit,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-ink mb-1">Ваши данные</h2>
        {matched ? (
          <p className="text-sm text-forest">✓ Дом найден{org ? ` — ЖК «${org.name}»` : ''}</p>
        ) : (
          <div className="text-sm text-ink/70 bg-amber/5 border border-amber/30 rounded-xl p-3 mt-2">
            ⚠ Дом не найден в базе. Заявка попадёт в очередь к администратору платформы.
            Регистрация будет завершена после одобрения (1–2 дня).
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">ФИО</span>
        <input type="text" value={fullName} required
          onChange={e => onChange({ fullName: e.target.value })}
          className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Email</span>
        <input type="email" value={email} required autoComplete="email"
          onChange={e => onChange({ email: e.target.value })}
          className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">№ квартиры (опционально)</span>
        <input type="text" value={apartmentNumber}
          onChange={e => onChange({ apartmentNumber: e.target.value })}
          className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Площадь, м² (опционально)</span>
        <input type="number" step="0.1" min="0" value={areaSqm}
          onChange={e => onChange({ areaSqm: e.target.value })}
          className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
        <span className="text-xs text-ink/50 block mt-1">
          Указание площади важно при голосовании по доле собственности.
        </span>
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="px-4 py-2.5 border border-border rounded-xl text-sm">
          ← Назад
        </button>
        <button type="button" onClick={onSubmit} disabled={loading}
          className="flex-1 px-4 py-2.5 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
          {loading ? 'Отправляем код...' : 'Отправить код на email'}
        </button>
      </div>
    </div>
  )
}
