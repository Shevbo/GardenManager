'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'

type Item = { id: string; type: string; title: string; body: string | null; href: string; readAt: string | null; createdAt: string }

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'только что'
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`
  return `${Math.floor(s / 86400)} дн назад`
}

export function NotificationBell() {
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications')
      if (!r.ok) return
      const d = await r.json() as { unread: number; items: Item[] }
      setUnread(d.unread); setItems(d.items)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function openItem(it: Item) {
    setOpen(false)
    if (!it.readAt) {
      await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id }) }).catch(() => {})
    }
    router.push(it.href)
    router.refresh()
  }

  async function markAll() {
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }).catch(() => {})
    load()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 flex items-center justify-center bg-white border border-[#E0DBD0] hover:border-[#0A3D2E] transition-colors"
        aria-label="Уведомления"
      >
        <Bell size={15} className="text-[#3D3D38]" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#E0DBD0] rounded-xl shadow-lg z-30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E0DBD0]">
            <span className="text-sm font-semibold text-[#1A1A18]">Уведомления</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-[#0A3D2E] hover:underline">Прочитать все</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#6B6B63]">Пока нет уведомлений</p>
            ) : (
              items.map(it => (
                <button
                  key={it.id}
                  onClick={() => openItem(it)}
                  className={`w-full text-left px-4 py-3 border-b border-[#F0EDE6] hover:bg-[#F7F5F0] transition-colors ${it.readAt ? '' : 'bg-[#F0F5F2]'}`}
                >
                  <div className="flex items-start gap-2">
                    {!it.readAt && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0A3D2E] shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#1A1A18] leading-snug">{it.title}</p>
                      {it.body && <p className="text-xs text-[#6B6B63] mt-0.5 truncate">{it.body}</p>}
                      <p className="text-[10px] text-[#B0A898] mt-1">{ago(it.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
