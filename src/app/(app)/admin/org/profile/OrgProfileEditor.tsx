'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Trash2, Star, ImageIcon } from 'lucide-react'

type Photo = { id: string; isCover: boolean }

export function OrgProfileEditor({
  orgId,
  initialName,
  initialType,
  orgTypes,
  initialDescription,
  initialAgendaVoteLimit,
  initialMapEmbedUrl,
  initialPhotos,
}: {
  orgId: string
  initialName: string
  initialType: string
  orgTypes: Array<{ code: string; label: string }>
  initialDescription: string
  initialAgendaVoteLimit: number
  initialMapEmbedUrl: string
  initialPhotos: Photo[]
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [type, setType] = useState(initialType)
  const [description, setDescription] = useState(initialDescription)
  const [agendaVoteLimit, setAgendaVoteLimit] = useState(String(initialAgendaVoteLimit))
  const [mapEmbedUrl, setMapEmbedUrl] = useState(initialMapEmbedUrl)
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [savingText, setSavingText] = useState(false)
  const [savedText, setSavedText] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function saveText() {
    setSavingText(true); setSavedText(false); setError('')
    try {
      const r = await fetch('/api/admin/org/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, name, type, description, mapEmbedUrl, agendaVoteLimit: Number(agendaVoteLimit) || undefined }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Не удалось сохранить'); return }
      setSavedText(true); router.refresh()
    } finally { setSavingText(false) }
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true); setError('')
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('orgId', orgId)
        fd.append('file', file)
        const r = await fetch('/api/admin/org/photos', { method: 'POST', body: fd })
        if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Не удалось загрузить'); continue }
        const { photo } = await r.json() as { photo: Photo }
        setPhotos(prev => [...prev, photo])
      }
      router.refresh()
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function remove(id: string) {
    setError('')
    const r = await fetch('/api/admin/org/photos', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoId: id }),
    })
    if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Не удалось удалить'); return }
    setPhotos(prev => prev.filter(p => p.id !== id))
    router.refresh()
  }

  async function setCover(id: string) {
    setError('')
    const r = await fetch('/api/admin/org/photos', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoId: id }),
    })
    if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Не удалось'); return }
    setPhotos(prev => prev.map(p => ({ ...p, isCover: p.id === id })))
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}

      {/* Name + type + description + map */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Название</label>
            <input value={name} onChange={e => { setName(e.target.value); setSavedText(false) }}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-forest" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Тип</label>
            <select value={type} onChange={e => { setType(e.target.value); setSavedText(false) }}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-white focus:outline-none focus:border-forest">
              {!orgTypes.some(t => t.code === type) && <option value={type}>{type}</option>}
              {orgTypes.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Описание</label>
          <textarea value={description} maxLength={4000} rows={5}
            onChange={e => { setDescription(e.target.value); setSavedText(false) }}
            placeholder="О вашей организации: инфраструктура, правила, контакты..."
            className="w-full px-3 py-2 border border-border rounded-xl text-sm resize-y focus:outline-none focus:border-forest" />
          <p className="text-xs text-ink/40 mt-1 text-right">{description.length} / 4000</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Лимит голосов за темы повестки</label>
          <input type="number" min={1} max={20} value={agendaVoteLimit}
            onChange={e => { setAgendaVoteLimit(e.target.value); setSavedText(false) }}
            className="w-28 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-forest" />
          <p className="text-xs text-ink/40 mt-1">
            За сколько тем собственник может голосовать для включения в одно собрание (по умолчанию 5).
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Яндекс-карта</label>
          <input value={mapEmbedUrl} onChange={e => { setMapEmbedUrl(e.target.value); setSavedText(false) }}
            placeholder="Вставьте ссылку/код с Яндекс.Карт → «Поделиться» → «Код»"
            className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-forest" />
          <p className="text-xs text-ink/40 mt-1">Откройте карту нужного места на Яндекс.Картах, «Поделиться» → «Код», вставьте сюда.</p>
          {mapEmbedUrl && /yandex\./i.test(mapEmbedUrl) && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border">
              <iframe src={mapEmbedUrl.match(/src=["']([^"']+)["']/i)?.[1] ?? mapEmbedUrl} className="w-full h-56" loading="lazy" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveText} disabled={savingText}
            className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {savingText ? 'Сохраняю...' : 'Сохранить'}
          </button>
          {savedText && <span className="text-sm text-[#1A6B3A]">Сохранено ✓</span>}
        </div>
      </div>

      {/* Photo gallery */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base flex items-center gap-2">
            <ImageIcon size={16} className="text-forest" /> Фотогалерея
          </h3>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-forest hover:bg-forest/5 disabled:opacity-50">
            <Upload size={14} /> {uploading ? 'Загрузка...' : 'Загрузить'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
            onChange={e => upload(e.target.files)} />
        </div>

        {photos.length === 0 ? (
          <p className="text-sm text-ink/50">Фотографий пока нет. Первая загруженная станет обложкой.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {photos.map(p => (
              <div key={p.id} className={`relative rounded-xl overflow-hidden border-2 ${p.isCover ? 'border-amber' : 'border-border'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/org-photos/${p.id}`} alt="" className="w-full h-28 object-cover" />
                {p.isCover && (
                  <span className="absolute top-1 left-1 bg-amber text-ink text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Star size={10} /> Обложка
                  </span>
                )}
                <div className="absolute bottom-1 right-1 flex gap-1">
                  {!p.isCover && (
                    <button onClick={() => setCover(p.id)} title="Сделать обложкой"
                      className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-ink/70 hover:text-amber">
                      <Star size={13} />
                    </button>
                  )}
                  <button onClick={() => remove(p.id)} title="Удалить"
                    className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-ink/70 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
