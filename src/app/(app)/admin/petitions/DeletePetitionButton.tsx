'use client'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeletePetitionButton({ petitionId, title }: { petitionId: string; title: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!window.confirm(`Удалить заявление «${title}»?\n\nЭто действие необратимо.`)) return
    const res = await fetch(`/api/petitions/${petitionId}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Не удалось удалить')
    }
  }

  return (
    <button
      onClick={handleDelete}
      title="Удалить заявление"
      className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-ink/30 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
    >
      <Trash2 size={14} />
    </button>
  )
}
