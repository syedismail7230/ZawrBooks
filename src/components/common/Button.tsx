import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-none';

    const variants = {
      primary: 'bg-[#111111] text-[#FFFFFF] hover:bg-[#222222] border border-[#111111]',
      secondary: 'bg-[#F4F3EF] text-[#111111] hover:bg-[#EAE8E2] border border-[#E5E5E5]',
      outline: 'bg-white text-[#111111] hover:bg-[#F9F9F8] border border-[#E5E5E5]',
      danger: 'bg-[#C5221F] text-white hover:bg-[#B01E1C] border border-[#C5221F]',
      ghost: 'bg-transparent text-[#111111] hover:bg-[#F4F3EF]',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1 gap-1.5',
      md: 'text-xs px-3.5 py-1.5 gap-2',
      lg: 'text-sm px-4 py-2 gap-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
