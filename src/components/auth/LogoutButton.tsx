'use client'
import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="flex items-center gap-2 px-3.5 py-2 text-sm text-ink/60 bg-white border border-border hover:border-red-300 hover:text-red-600 transition-colors"
    >
      <LogOut size={14} />
      Выйти
    </button>
  )
}
