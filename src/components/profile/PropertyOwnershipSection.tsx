'use client'
import { useState, useEffect, useCallback } from 'react'
import { AddressAutocomplete } from '@/components/address/AddressAutocomplete'
import { useConfirm } from '@/components/ui/dialog'

type PropertyOwnership = {
  id: string
  address: string
  addressNormalized: string | null
  apartmentNumber: string | null
  areaSqm: number | null
  sharePercent: number | null
  orgName: string | null
  signedAt: string | null
  showInRegistry: boolean
  declaredText: string | null
  createdAt: string
}

type DeclareState = {
  step: 'idle' | 'otp'
  loading: boolean
  error: string
  otp: string
}

function PropertyCard({
  item,
  onDeleted,
  onSigned,
  onToggleRegistry,
}: {
  item: PropertyOwnership
  onDeleted: (id: string) => void
  onSigned: (id: string, signedAt: string) => void
  onToggleRegistry: (id: string, value: boolean) => void
}) {
  const confirm = useConfirm()
  const [deleting, setDeleting] = useState(false)
  const [savingReg, setSavingReg] = useState(false)

  async function toggleRegistry() {
    const next = !item.showInRegistry
    setSavingReg(true)
    try {
      const res = await fetch(`/api/profile/property/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showInRegistry: next }),
      })
      if (res.ok) onToggleRegistry(item.id, next)
    } finally { setSavingReg(false) }
  }
  const [declare, setDeclare] = useState<DeclareState>({
    step: 'idle', loading: false, error: '', otp: '',
  })

  const declaredText = `Я подтверждаю, что являюсь собственником объекта по адресу: «${item.address}${item.apartmentNumber ? `, кв. ${item.apartmentNumber}` : ''}»${item.areaSqm ? `, площадь ${item.areaSqm} м²` : ''}${item.sharePercent ? `, доля ${item.sharePercent}%` : ''}. Смогу подтвердить правоустанавливающими документами при необходимости.`

  async function handleDelete() {
    if (!(await confirm({ title: 'Удалить объект?', message: `«${item.address}»`, confirmLabel: 'Удалить', tone: 'danger' }))) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/profile/property/${item.id}`, { method: 'DELETE' })
      if (res.ok) onDeleted(item.id)
    } finally { setDeleting(false) }
  }

  async function requestOtp() {
    setDeclare(d => ({ ...d, loading: true, error: '' }))
    try {
      const res = await fetch('/api/profile/property/declare-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: item.id }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setDeclare(d => ({
          ...d, loading: false,
          error: data.error === 'phone_not_verified'
            ? 'Сначала подтвердите телефон в профиле'
            : (data.error || 'Не удалось отправить код'),
        }))
        return
      }
      setDeclare(d => ({ ...d, loading: false, step: 'otp' }))
    } catch {
      setDeclare(d => ({ ...d, loading: false, error: 'Ошибка сети' }))
    }
  }

  async function verifyOtp() {
    setDeclare(d => ({ ...d, loading: true, error: '' }))
    try {
      const res = await fetch('/api/profile/property/declare-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: item.id, otp: declare.otp.trim(), declaredText }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setDeclare(d => ({ ...d, loading: false, error: data.error || 'Не удалось подтвердить' }))
        return
      }
      onSigned(item.id, new Date().toISOString())
      setDeclare(d => ({ ...d, loading: false, step: 'idle', otp: '' }))
    } catch {
      setDeclare(d => ({ ...d, loading: false, error: 'Ошибка сети' }))
    }
  }

  const signedAt = item.signedAt
    ? new Date(item.signedAt).toLocaleString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink text-sm leading-snug">
            {item.address}
            {item.apartmentNumber && `, кв. ${item.apartmentNumber}`}
          </p>
          <p className="text-xs text-ink/50 mt-0.5">
            {item.orgName || 'Без организации'}
            {item.areaSqm && ` · ${item.areaSqm} м²`}
            {item.sharePercent && ` · ${item.sharePercent}%`}
          </p>
        </div>
        {signedAt && (
          <span className="shrink-0 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-forest/10 text-forest">
            ✓ Подписано
          </span>
        )}
      </div>

      <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={item.showInRegistry}
          onChange={toggleRegistry}
          disabled={savingReg}
          className="w-4 h-4 accent-forest"
        />
        <span className="text-xs text-ink/70">
          Показывать этот объект в реестре подписантов
          {savingReg && ' …'}
        </span>
      </label>

      {signedAt ? (
        <>
          <div className="mb-3 p-3 bg-forest/5 border border-forest/20 rounded-lg">
            <p className="text-[10px] font-bold tracking-wider uppercase text-forest mb-1.5">
              Подтверждение собственности — подписано по СМС
            </p>
            <p className="text-xs text-ink/70 leading-relaxed">{item.declaredText ?? declaredText}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-ink/50">
              {item.apartmentNumber && <span>кв. {item.apartmentNumber}</span>}
              {item.areaSqm != null && <span>площадь {item.areaSqm} м²</span>}
              {item.sharePercent != null && <span>доля {item.sharePercent}%</span>}
              <span>{item.orgName || 'без организации'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink/50">Декларация подписана {signedAt}</p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-ink/40 hover:text-red-500 underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Удаляем...' : 'Удалить'}
            </button>
          </div>
        </>
      ) : declare.step === 'idle' ? (
        <>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
            Черновик — подпишите через SMS для подтверждения собственности
          </p>
          <div className="mb-3 text-xs text-ink/60 p-3 bg-cream rounded-lg leading-relaxed">
            {declaredText}
          </div>
          {declare.error && <p className="text-sm text-red-500 mb-2">{declare.error}</p>}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={requestOtp}
              disabled={declare.loading}
              className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {declare.loading ? 'Отправляем код...' : 'Подписать через SMS'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-ink/40 hover:text-red-500 underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Удаляем...' : 'Удалить'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink/70 mb-3">Введите код из SMS</p>
          <input
            type="text"
            inputMode="numeric"
            value={declare.otp}
            onChange={e => setDeclare(d => ({ ...d, otp: e.target.value }))}
            placeholder="6 цифр"
            className="w-full px-3 py-2 border border-border rounded-xl text-base text-center tracking-widest mb-3"
          />
          {declare.error && <p className="text-sm text-red-500 mb-2">{declare.error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setDeclare(d => ({ ...d, step: 'idle', error: '', otp: '' }))}
              className="px-3 py-2 border border-border rounded-xl text-sm"
            >
              ← Назад
            </button>
            <button
              onClick={verifyOtp}
              disabled={declare.loading || !declare.otp.trim()}
              className="flex-1 px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {declare.loading ? 'Проверяем...' : 'Подтвердить'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function PropertyOwnershipSection() {
  const [items, setItems] = useState<PropertyOwnership[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [address, setAddress] = useState('')
  const [apartment, setApartment] = useState('')
  const [area, setArea] = useState('')
  const [share, setShare] = useState('')

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/property')
      if (res.ok) {
        const data = await res.json() as PropertyOwnership[]
        setItems(data)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchItems() }, [fetchItems])

  function handleDeleted(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function handleSigned(id: string, signedAt: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, signedAt } : i))
  }

  function handleToggleRegistry(id: string, value: boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, showInRegistry: value } : i))
  }

  async function handleAdd() {
    if (!address.trim()) { setAddError('Введите адрес'); return }
    setAddLoading(true); setAddError('')
    try {
      const res = await fetch('/api/profile/property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          addressNormalized: address.trim(),
          apartmentNumber: apartment.trim() || undefined,
          areaSqm: area.trim() ? Number(area) : undefined,
          sharePercent: share.trim() ? Number(share) : undefined,
        }),
      })
      const data = await res.json() as PropertyOwnership & { error?: string }
      if (!res.ok) { setAddError(data.error || 'Ошибка'); return }
      setItems(prev => [data, ...prev])
      setAddress(''); setApartment(''); setArea(''); setShare('')
      setAddOpen(false)
    } catch { setAddError('Ошибка сети') }
    finally { setAddLoading(false) }
  }

  if (loading) return <p className="text-sm text-ink/50 py-2">Загружаем...</p>

  return (
    <div className="space-y-3">
      {items.length === 0 && !addOpen && (
        <p className="text-sm text-ink/50">
          Нет самозаявленных объектов собственности.
        </p>
      )}

      {items.map(item => (
        <PropertyCard
          key={item.id}
          item={item}
          onDeleted={handleDeleted}
          onSigned={handleSigned}
          onToggleRegistry={handleToggleRegistry}
        />
      ))}

      {addOpen ? (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
          <h3 className="font-display font-bold text-ink text-sm">Добавить объект собственности</h3>
          <div>
            <label className="text-xs font-medium text-ink/70 uppercase tracking-wider block mb-1.5">
              Адрес здания (КЛАДР)
            </label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder="Начните вводить адрес..."
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Квартира</span>
              <input
                type="text"
                value={apartment}
                onChange={e => setApartment(e.target.value)}
                placeholder="№"
                className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Площадь, м²</span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={area}
                onChange={e => setArea(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink/70 uppercase tracking-wider">Доля, %</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={share}
                onChange={e => setShare(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-border rounded-xl text-sm"
              />
            </label>
          </div>
          {addError && <p className="text-sm text-red-500">{addError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setAddOpen(false); setAddError(''); setAddress(''); setApartment(''); setArea(''); setShare('') }}
              className="px-3 py-2 border border-border rounded-xl text-sm"
            >
              Отмена
            </button>
            <button
              onClick={handleAdd}
              disabled={addLoading || !address.trim()}
              className="flex-1 px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {addLoading ? 'Добавляем...' : 'Добавить'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddOpen(true)}
          className="w-full py-2.5 border border-dashed border-border rounded-2xl text-sm text-ink/60 hover:border-forest hover:text-forest transition-colors"
        >
          + Добавить объект собственности
        </button>
      )}
    </div>
  )
}
