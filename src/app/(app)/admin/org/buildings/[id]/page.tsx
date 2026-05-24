'use client'

import { useState, useEffect, useCallback } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface Apartment {
  id: string
  number: string
  floor: number | null
  entrance: number | null
  areaSqm: number | null
  memberships: { user: { id: string; name: string | null; email: string | null } }[]
}

export default function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [buildingAddress, setBuildingAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ number: '', floor: '', entrance: '', areaSqm: '' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/org/buildings/${id}/apartments`)
    if (res.ok) {
      const data = await res.json()
      setApartments(data.apartments)
      // Building address from first apartment or re-fetch
    }
    // Fetch building info
    const bRes = await fetch('/api/admin/org/buildings')
    if (bRes.ok) {
      const bData = await bRes.json()
      const b = bData.buildings.find((b: { id: string; address: string }) => b.id === id)
      if (b) setBuildingAddress(b.address)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function addApartment() {
    if (!form.number.trim()) return
    setAdding(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/org/buildings/${id}/apartments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Ошибка')
        return
      }
      setForm({ number: '', floor: '', entrance: '', areaSqm: '' })
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
          <Link href="/admin/org/buildings" className="text-sm text-gray-500 hover:underline">← Дома</Link>
          <h1 className="text-2xl font-semibold mt-1">{buildingAddress || 'Дом'}</h1>
          <p className="text-sm text-gray-500">{apartments.length} квартир</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>+ Квартира</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="font-medium">Новая квартира</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Номер *</label>
              <input
                type="text"
                value={form.number}
                onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                placeholder="42"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Площадь (м²)</label>
              <input
                type="number"
                value={form.areaSqm}
                onChange={e => setForm(f => ({ ...f, areaSqm: e.target.value }))}
                placeholder="54.3"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Этаж</label>
              <input
                type="number"
                value={form.floor}
                onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                placeholder="5"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Подъезд</label>
              <input
                type="number"
                value={form.entrance}
                onChange={e => setForm(f => ({ ...f, entrance: e.target.value }))}
                placeholder="2"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={addApartment} loading={adding}>Добавить</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Отмена</Button>
          </div>
        </div>
      )}

      {apartments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
          Нет квартир. Добавьте квартиры вручную или импортируйте CSV.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {apartments.map(apt => (
            <div key={apt.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <span className="font-medium">кв. {apt.number}</span>
                {apt.areaSqm && <span className="text-sm text-gray-500 ml-2">{apt.areaSqm} м²</span>}
                {apt.floor && <span className="text-sm text-gray-400 ml-2">эт. {apt.floor}</span>}
                {apt.entrance && <span className="text-sm text-gray-400 ml-1">пд. {apt.entrance}</span>}
              </div>
              {apt.memberships[0] ? (
                <span className="text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {apt.memberships[0].user.name || apt.memberships[0].user.email}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Не привязана</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
