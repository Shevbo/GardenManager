'use client'
import { AddressAutocomplete } from '@/components/address/AddressAutocomplete'

type Props = {
  value: string
  onChange: (v: string) => void
  loading: boolean
  error: string
  onNext: () => void
}

export function StepAddress({ value, onChange, loading, error, onNext }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-ink mb-1">Адрес дома</h2>
        <p className="text-sm text-ink/60">Начните вводить — мы подскажем варианты</p>
      </div>
      <AddressAutocomplete
        value={value}
        onChange={onChange}
        placeholder="Например, Москва, ул. Садовая, д. 12"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={onNext}
        disabled={!value.trim() || loading}
        className="w-full px-4 py-2.5 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Проверяем...' : 'Далее'}
      </button>
    </div>
  )
}
