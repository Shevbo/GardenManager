'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface Member {
  id: string
  role: string
  isOwner: boolean
  areaSqm: number | null
  user: { id: string; name: string | null; email: string | null; phone: string | null }
  apartment: { number: string; building: { address: string } } | null
}

interface Building {
  id: string
  address: string
  _count: { apartments: number }
}

interface Apartment {
  id: string
  number: string
}

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Платформа',
  coalition_admin: 'Коалиция',
  org_admin: 'Администратор',
  council_member: 'Совет',
  owner: 'Собственник',
  tenant: 'Арендатор',
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteLink, setInviteLink] = useState('')
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [selectedApartmentId, setSelectedApartmentId] = useState('')
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [removingId, setRemovingId] = useState('')

  const load = useCallback(async () => {
    const [mRes, bRes] = await Promise.all([
      fetch('/api/admin/org/members'),
      fetch('/api/admin/org/buildings'),
    ])
    if (mRes.ok) setMembers((await mRes.json()).members)
    if (bRes.ok) setBuildings((await bRes.json()).buildings)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selectedBuildingId) { setApartments([]); setSelectedApartmentId(''); return }
    fetch(`/api/admin/org/buildings/${selectedBuildingId}/apartments`)
      .then(r => r.json())
      .then(d => setApartments(d.apartments || []))
  }, [selectedBuildingId])

  async function generateInvite() {
    setGeneratingInvite(true)
    try {
      const res = await fetch('/api/admin/org/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apartmentId: selectedApartmentId || null }),
      })
      if (res.ok) {
        const data = await res.json()
        const url = `${window.location.origin}/invite/${data.link.token}`
        setInviteLink(url)
      }
    } finally {
      setGeneratingInvite(false)
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Удалить участника?')) return
    setRemovingId(memberId)
    try {
      await fetch(`/api/admin/org/members/${memberId}`, { method: 'DELETE' })
      await load()
    } finally {
      setRemovingId('')
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-5 py-8 text-gray-400">Загрузка...</div>

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <div>
        <Link href="/admin/org" className="text-sm text-gray-500 hover:underline">← Организация</Link>
        <h1 className="text-2xl font-semibold mt-1">Участники</h1>
        <p className="text-sm text-gray-500">{members.length} человек</p>
      </div>

      {/* Invite link generator */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-medium">Пригласить жильца</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Дом (опционально)</label>
            <select
              value={selectedBuildingId}
              onChange={e => setSelectedBuildingId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">— Без привязки к дому —</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.address}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Квартира (опционально)</label>
            <select
              value={selectedApartmentId}
              onChange={e => setSelectedApartmentId(e.target.value)}
              disabled={!selectedBuildingId}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">— Без квартиры —</option>
              {apartments.map(a => (
                <option key={a.id} value={a.id}>кв. {a.number}</option>
              ))}
            </select>
          </div>
        </div>
        <Button onClick={generateInvite} loading={generatingInvite}>Создать ссылку-приглашение</Button>

        {inviteLink && (
          <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Ссылка действует 7 дней:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs break-all text-emerald-800 flex-1">{inviteLink}</code>
              <button
                onClick={() => navigator.clipboard.writeText(inviteLink)}
                className="text-xs text-emerald-700 hover:underline shrink-0"
              >
                Копировать
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
          Нет участников.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {members.map(m => (
            <div key={m.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.user.name || m.user.email || m.user.phone || '—'}</div>
                <div className="text-sm text-gray-500 truncate">
                  {m.user.email}{m.user.phone && ` · ${m.user.phone}`}
                </div>
                {m.apartment && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {m.apartment.building.address}, кв. {m.apartment.number}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
                {m.isOwner && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Собственник</span>
                )}
                <button
                  onClick={() => removeMember(m.id)}
                  disabled={removingId === m.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 ml-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
