import React from 'react';
import { formatINR } from '@/lib/accounting/engine';
import { cn } from '@/lib/utils';

export interface CurrencyDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  paise: number;
  showSignColor?: boolean;
  showSymbol?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  paise,
  showSignColor = false,
  showSymbol = true,
  className,
  ...props
}) => {
  const isNegative = paise < 0;
  const isPositive = paise > 0;

  let colorClass = 'text-[#111111]';
  if (showSignColor) {
    if (isNegative) colorClass = 'text-[#C5221F]';
    else if (isPositive) colorClass = 'text-[#137333]';
  }

  return (
    <span
      className={cn('num-tabular font-mono whitespace-nowrap', colorClass, className)}
      {...props}
    >
      {formatINR(paise, showSymbol)}
    </span>
  );
};
