'use client';
import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

type InputBaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'>;

interface InputProps extends InputBaseProps {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, prefix, suffix, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <div className={cn(
          'flex items-center gap-2 bg-white border rounded-xl px-3.5 py-2.5 transition-all',
          error ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-200'
                : 'border-[#D6D0C4] focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/10',
        )}>
          {prefix && <span className="text-ink-soft shrink-0">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 bg-transparent text-ink placeholder:text-ink-soft outline-none text-sm',
              className
            )}
            {...props}
          />
          {suffix && <span className="text-ink-soft shrink-0">{suffix}</span>}
        </div>
        {(hint || error) && (
          <p className={cn('text-xs', error ? 'text-red-500' : 'text-ink-soft')}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
