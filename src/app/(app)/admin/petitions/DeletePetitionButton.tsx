'use client'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useConfirm, useNotify } from '@/components/ui/dialog'

export function DeletePetitionButton({ petitionId, title }: { petitionId: string; title: string }) {
  const router = useRouter()
  const confirm = useConfirm()
  const notify = useNotify()

  async function handleDelete() {
    const ok = await confirm({
      title: 'Удалить заявление?',
      message: `«${title}»\n\nЭто действие необратимо.`,
      confirmLabel: 'Удалить',
      tone: 'danger',
    })
    if (!ok) return
    const res = await fetch(`/api/petitions/${petitionId}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      await notify({ title: 'Не удалось удалить', message: data.error ?? 'Попробуйте ещё раз.', tone: 'danger' })
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
