'use client'
import { Button } from '@/components/ui/Button'

export function ExportButton({ petitionId }: { petitionId: string }) {
  async function download() {
    const res = await fetch(`/api/petitions/${petitionId}/export`, { method: 'POST' })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `petition-${petitionId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <Button className="w-full" onClick={download}>
      Скачать PDF с реестром подписей
    </Button>
  )
}
