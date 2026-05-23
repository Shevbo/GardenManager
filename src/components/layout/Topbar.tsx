'use client';
import { Bell, Search } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 bg-[#F7F5F0] border-b border-[#E0DBD0] px-8 py-4 flex items-center gap-6">
      <div className="flex-1">
        <h1 className="font-display text-xl font-bold text-[#1A1A18] leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-[#6B6B63] mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 bg-white border border-[#E0DBD0] px-3.5 py-2 text-sm text-[#6B6B63] hover:border-[#0A3D2E] transition-colors w-56">
          <Search size={14} />
          <span>Поиск...</span>
          <kbd className="ml-auto text-[10px] text-[#B0A898] bg-[#F0EDE6] px-1.5 py-0.5">⌘K</kbd>
        </button>

        <button className="relative w-9 h-9 flex items-center justify-center bg-white border border-[#E0DBD0] hover:border-[#0A3D2E] transition-colors">
          <Bell size={15} className="text-[#3D3D38]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500" />
        </button>

        {actions}
      </div>
    </header>
  );
}
