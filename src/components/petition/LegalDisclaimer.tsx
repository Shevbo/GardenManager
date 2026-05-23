'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  onAccept: () => void
  loading: boolean
}

export function LegalDisclaimer({ onAccept, loading }: Props) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 leading-relaxed">
        <p className="font-semibold mb-2">Юридически значимое действие</p>
        <p>
          Подписывая данное заявление с подтверждением через SMS/email, я подтверждаю своё
          согласие с текстом заявления. Настоящая электронная подпись с верификацией канала
          связи эквивалентна моей собственноручной подписи на заявлении, которое будет
          направлено в государственные органы. Я осознаю юридические последствия данного
          действия.
        </p>
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-1 w-4 h-4"
        />
        <span className="text-sm text-gray-700">
          Я прочитал(а) и принимаю условия, понимаю юридические последствия подписания
        </span>
      </label>
      <Button
        onClick={onAccept}
        disabled={!agreed || loading}
        className="w-full"
      >
        {loading ? 'Подписываем...' : 'Подписать заявление'}
      </Button>
    </div>
  )
}
