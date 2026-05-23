import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT:      'Черновик',
  ANNOUNCED:  'Объявлено',
  DISCUSSION: 'Обсуждение',
  VOTING:     'Голосование',
  CLOSED:     'Закрыто',
  SIGNED:     'Подписано',
  ARCHIVED:   'Архив',
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT:      'bg-slate-100 text-slate-600',
  ANNOUNCED:  'bg-blue-100 text-blue-700',
  DISCUSSION: 'bg-indigo-100 text-indigo-700',
  VOTING:     'bg-amber-100 text-amber-700',
  CLOSED:     'bg-emerald-100 text-emerald-700',
  SIGNED:     'bg-green-100 text-green-800',
  ARCHIVED:   'bg-gray-100 text-gray-500',
};

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}
