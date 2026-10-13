import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerAction,
  noPadding = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-[#E5E5E5] rounded-none shadow-none',
        className
      )}
      {...props}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] bg-[#FFFFFF]">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-[11px] text-[#666666] mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={cn(noPadding ? 'p-0' : 'p-4')}>{children}</div>
    </div>
  );
};
