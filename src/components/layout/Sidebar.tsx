'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Vote,
  FileSignature,
  CheckSquare,
  MessageSquare,
  Settings,
  Building2,
  ChevronDown,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',         icon: LayoutDashboard, label: 'Главная' },
  { href: '/assemblies',        icon: Vote,            label: 'Собрания' },
  { href: '/admin/petitions',   icon: FileSignature,   label: 'Заявления' },
  { href: '/activities',        icon: CheckSquare,     label: 'Активности' },
  { href: '/chats',             icon: MessageSquare,   label: 'Чаты' },
];

const BOTTOM_ITEMS = [
  { href: '/admin/platform',    icon: Settings, label: 'Управление' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-forest flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-ink" />
          </div>
          <div>
            <p className="text-white font-display text-sm font-bold leading-tight">Garden</p>
            <p className="text-white/50 text-xs">Manager</p>
          </div>
        </div>
      </div>

      {/* Org selector */}
      <div className="px-3 py-3 border-b border-white/10">
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/10 transition-colors text-left">
          <div className="w-7 h-7 bg-amber/20 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-amber text-xs font-bold">ЖК</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">ЖК «Садовый»</p>
            <p className="text-white/40 text-[10px] truncate">Москва, ул. Садовая 12</p>
          </div>
          <ChevronDown size={14} className="text-white/40 shrink-0" />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                active
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-white/10 space-y-0.5">
        {BOTTOM_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                active
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}

        {/* User */}
        <Link href="/profile" className="mt-2 flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">П</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">Профиль</p>
            <p className="text-white/40 text-[10px] truncate">Настройки аккаунта</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
