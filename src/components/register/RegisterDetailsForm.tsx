'use client'
import { useState } from 'react'
import { AddressAutocomplete } from '@/components/address/AddressAutocomplete'

export function RegisterDetailsForm({ initialName }: { initialName: string }) {
  const [rawAddress, setRawAddress] = useState('')
  const [apartmentNumber, setApartmentNumber] = useState('')
  const [areaSqm, setAreaSqm] = useState('')
  const [fullName, setFullName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/register/details', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          rawAddress: rawAddress.trim(),
          apartmentNumber: apartmentNumber.trim() || undefined,
          areaSqm: areaSqm.trim() ? Number(areaSqm) : undefined,
        }),
      })
      const data = await res.json() as { ok?: boolean; mode?: string; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error || 'Не удалось завершить регистрацию')
        return
      }
      window.location.href = data.mode === 'pending' ? '/dashboard?welcome=pending' : '/dashboard?welcome=active'
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={submit}
        className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md border border-gray-100 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-center text-gray-900">Завершите регистрацию</h1>
          <p className="text-center text-sm text-gray-500 mt-1">Несколько шагов до полного доступа</p>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">ФИО</span>
          <input type="text" value={fullName} required
            onChange={e => setFullName(e.target.value)}
            className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
        </label>

        <div>
          <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Адрес дома</span>
          <div className="mt-1.5">
            <AddressAutocomplete value={rawAddress} onChange={setRawAddress}
              placeholder="Москва, ул. Садовая, д. 12" />
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">№ квартиры (опц.)</span>
          <input type="text" value={apartmentNumber}
            onChange={e => setApartmentNumber(e.target.value)}
            className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Площадь, м² (опц.)</span>
          <input type="number" step="0.1" min="0" value={areaSqm}
            onChange={e => setAreaSqm(e.target.value)}
            className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm" />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full px-4 py-2.5 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
          {loading ? 'Сохраняем...' : 'Завершить'}
        </button>
      </form>
    </div>
  )
}
