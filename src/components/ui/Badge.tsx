'use client';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  DRAFT:      'Черновик',
  ANNOUNCED:  'Объявлено',
  DISCUSSION: 'Обсуждение',
  VOTING:     'Голосование',
  CLOSED:     'Завершено',
  SIGNED:     'Подписано',
  ARCHIVED:   'Архив',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT:      'bg-[#F0EDE6] text-[#6B6B63]',
  ANNOUNCED:  'bg-[#EAF0FF] text-[#3A5FC8]',
  DISCUSSION: 'bg-[#EAF0FF] text-[#3A5FC8]',
  VOTING:     'bg-[#FFF3DC] text-[#8A5A00]',
  CLOSED:     'bg-[#E6F5EE] text-[#1A6B3A]',
  SIGNED:     'bg-[#E6F5EE] text-[#1A6B3A]',
  ARCHIVED:   'bg-[#F0EDE6] text-[#6B6B63]',
};

interface BadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 text-xs font-medium tracking-wide uppercase',
      STATUS_STYLES[status] ?? 'bg-[#F0EDE6] text-[#6B6B63]',
      className
    )}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
