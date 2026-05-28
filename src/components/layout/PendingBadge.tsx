'use client'
import { useEffect, useState } from 'react'

export function PendingBadge() {
  const [pending, setPending] = useState(false)

  useEffect(() => {
    fetch('/api/me/permissions')
      .then(r => r.ok ? r.json() : null)
      .then((d: { blockers?: string[] } | null) => {
        if (d?.blockers?.includes('pending')) setPending(true)
      })
      .catch(() => {})
  }, [])

  if (!pending) return null

  return (
    <div className="mx-3 mb-3 p-3 bg-amber/10 border border-amber/30 rounded-xl text-xs text-white/80 leading-relaxed">
      ⏳ Ваша заявка ждёт одобрения администратором платформы.
      Полный доступ откроется после подтверждения.
    </div>
  )
}
