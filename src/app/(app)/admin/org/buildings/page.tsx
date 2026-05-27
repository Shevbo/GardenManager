'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { AddressAutocomplete } from '@/components/address/AddressAutocomplete'

interface Building {
  id: string
  address: string
  _count: { apartments: number }
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/org/buildings')
    if (res.ok) {
      const data = await res.json()
      setBuildings(data.buildings)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addBuilding() {
    if (!address.trim()) return
    setAdding(true)
    setError('')
    try {
      const res = await fetch('/api/admin/org/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Ошибка')
        return
      }
      setAddress('')
      setShowForm(false)
      await load()
    } finally {
      setAdding(false)
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-5 py-8 text-gray-400">Загрузка...</div>

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/org" className="text-sm text-gray-500 hover:underline">← Организация</Link>
          <h1 className="text-2xl font-semibold mt-1">Дома</h1>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>+ Добавить дом</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="font-medium">Новый дом</h2>
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            placeholder="Адрес дома (ул. Садовая, д. 1)"
            className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={addBuilding} loading={adding}>Добавить</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Отмена</Button>
          </div>
        </div>
      )}

      {buildings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
          Нет домов. Добавьте первый дом.
        </div>
      ) : (
        <div className="space-y-3">
          {buildings.map(b => (
            <Link
              key={b.id}
              href={`/admin/org/buildings/${b.id}`}
              className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-emerald-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.address}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{b._count.apartments} квартир</div>
                </div>
                <div className="text-gray-400 text-sm">Управлять →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
