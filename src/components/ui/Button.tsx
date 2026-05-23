'use client';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 cursor-pointer select-none',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          size === 'sm' && 'px-3.5 py-2 text-sm',
          size === 'md' && 'px-5 py-2.5 text-sm',
          size === 'lg' && 'px-7 py-3.5 text-base',
          variant === 'primary'   && 'bg-[#0A3D2E] text-white hover:bg-[#145C43] active:scale-[0.98]',
          variant === 'secondary' && 'bg-[#EAE6DC] text-[#1A1A18] hover:bg-[#D6D0C4] active:scale-[0.98]',
          variant === 'ghost'     && 'text-[#3D3D38] hover:bg-[#EAE6DC] active:scale-[0.98]',
          variant === 'danger'    && 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
          variant === 'amber'     && 'bg-[#E8A020] text-[#1A1A18] font-semibold hover:bg-[#F5C050] active:scale-[0.98]',
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
