'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function ExportButton({ petitionId }: { petitionId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/petitions/${petitionId}/export`, { method: 'POST' })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `petition-${petitionId}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Ошибка генерации PDF')
      }
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={download} disabled={loading}>
        {loading ? 'Генерируем PDF...' : 'Скачать PDF с реестром подписей'}
      </Button>
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  )
}
