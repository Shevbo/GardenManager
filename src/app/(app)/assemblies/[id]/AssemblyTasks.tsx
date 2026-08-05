'use client'
import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'

type Task = { id: string; text: string; dueDate: string | null; done: boolean; createdAt: string; assignee: { id: string; name: string | null; email: string | null } | null }
type Member = { id: string; label: string }

export function AssemblyTasks({ assemblyId }: { assemblyId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [canManage, setCanManage] = useState(false)
  const [text, setText] = useState('')
  const [assignee, setAssignee] = useState('')
  const [due, setDue] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/assemblies/${assemblyId}/tasks`)
      if (!r.ok) return
      const d = await r.json() as { tasks: Task[]; canManage: boolean; members?: Member[] }
      setTasks(d.tasks); setCanManage(d.canManage); setMembers(d.members ?? [])
    } catch {}
  }, [assemblyId])

  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || adding) return
    setAdding(true); setError('')
    try {
      const r = await fetch(`/api/assemblies/${assemblyId}/tasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), assigneeUserId: assignee || null, dueDate: due || null }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Не удалось добавить'); return }
      setText(''); setAssignee(''); setDue('')
      await load()
    } finally { setAdding(false) }
  }

  async function toggle(task: Task) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t))
    await fetch(`/api/assemblies/${assemblyId}/tasks`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, done: !task.done }),
    }).catch(() => load())
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
        <ClipboardList size={16} className="text-forest" /> Поручения из протокола
      </h3>

      <div className="space-y-2 mb-4">
        {tasks.length === 0 && <p className="text-sm text-ink/50">Поручений пока нет.</p>}
        {tasks.map(t => (
          <div key={t.id} className="flex items-start gap-3 py-2 border-b border-[#F0EDE6] last:border-0">
            <input type="checkbox" checked={t.done} disabled={!canManage} onChange={() => toggle(t)}
              className="mt-1 w-4 h-4 accent-[#0A3D2E] disabled:opacity-50" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${t.done ? 'line-through text-ink/40' : 'text-ink'}`}>{t.text}</p>
              <p className="text-xs text-ink/50 mt-0.5">
                {t.assignee ? `Ответственный: ${t.assignee.name || t.assignee.email}` : 'Без ответственного'}
                {t.dueDate ? ` · срок ${new Date(t.dueDate).toLocaleDateString('ru-RU')}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      {canManage && (
        <form onSubmit={add} className="border-t border-border pt-4 space-y-2">
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Текст поручения"
            className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
          <div className="flex gap-2">
            <select value={assignee} onChange={e => setAssignee(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-xl text-sm bg-white">
              <option value="">Ответственный (необязательно)</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <input type="date" value={due} onChange={e => setDue(e.target.value)}
              className="px-3 py-2 border border-border rounded-xl text-sm" />
          </div>
          <button type="submit" disabled={adding || !text.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-forest text-white rounded-xl text-sm font-medium disabled:opacity-50">
            <Plus size={14} /> Добавить поручение
          </button>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </form>
      )}
    </div>
  )
}
