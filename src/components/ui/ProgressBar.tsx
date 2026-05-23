import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  variant?: 'forest' | 'amber' | 'emerald';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  sublabel,
  variant = 'forest',
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(label || sublabel) && (
        <div className="flex items-baseline justify-between gap-4">
          {label   && <span className="text-sm text-[#6B6B63]">{label}</span>}
          {sublabel && <span className="text-sm font-semibold text-[#1A1A18] shrink-0">{sublabel}</span>}
        </div>
      )}
      <div className="h-2 bg-[#EAE6DC] overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-700 ease-out',
            variant === 'amber' ? 'bg-[#E8A020]' : 'bg-[#0A3D2E]', // emerald = forest alias
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-[#6B6B63] mt-0.5">{pct}% выполнено</p>
    </div>
  );
}
