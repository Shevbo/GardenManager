'use client'
import { useState } from 'react'

const CONSENT_TEXT =
  'Я понимаю, что комментируя и подписывая документы по данной активности, ' +
  'я разделяю ответственность за представление интересов группы при необходимости.'

interface Props {
  activityName: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function ConsentModal({ activityName, onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <h3 className="font-display text-lg font-bold text-ink mb-2">
          Вступить в активность
        </h3>
        <p className="text-sm text-ink/60 mb-4">
          <span className="font-medium text-ink">{activityName}</span>
        </p>
        <div className="bg-cream border border-border rounded-xl p-4 mb-6">
          <p className="text-sm text-ink leading-relaxed">{CONSENT_TEXT}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-ink text-sm hover:bg-cream transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-forest text-white text-sm font-medium hover:bg-forest/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Подождите...' : 'Подтверждаю'}
          </button>
        </div>
      </div>
    </div>
  )
}
