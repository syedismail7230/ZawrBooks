import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  className,
  children,
  ...props
}) => {
  // Determine variant based on status if variant is not explicitly provided
  let effectiveVariant = variant || 'default';

  if (!variant && status) {
    const s = status.toLowerCase();
    if (s.includes('posted') || s.includes('approved') || s.includes('paid') || s.includes('success')) {
      effectiveVariant = 'success';
    } else if (
      s.includes('submitted') ||
      s.includes('under review') ||
      s.includes('partially') ||
      s.includes('warning')
    ) {
      effectiveVariant = 'warning';
    } else if (
      s.includes('rejected') ||
      s.includes('returned') ||
      s.includes('overdue') ||
      s.includes('reversed') ||
      s.includes('error')
    ) {
      effectiveVariant = 'error';
    } else if (s.includes('issued') || s.includes('draft')) {
      effectiveVariant = 'info';
    }
  }

  const variants = {
    default: 'bg-[#F4F3EF] text-[#555555] border-[#E5E5E5]',
    success: 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]',
    warning: 'bg-[#FEF7E0] text-[#B25900] border-[#FEEFC3]',
    error: 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]',
    info: 'bg-[#E8F0FE] text-[#1967D2] border-[#D2E3FC]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium border rounded-none uppercase tracking-wider',
        variants[effectiveVariant],
        className
      )}
      {...props}
    >
      {children || status}
    </span>
  );
};
