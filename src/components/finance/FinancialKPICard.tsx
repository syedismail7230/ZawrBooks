import React from 'react';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FinancialKPICardProps {
  label: string;
  amountPaise: number;
  periodText?: string;
  comparisonText?: string;
  changePercent?: number;
  basisOfCalculation: string;
  isProfit?: boolean;
}

export const FinancialKPICard: React.FC<FinancialKPICardProps> = ({
  label,
  amountPaise,
  periodText = 'Current FY (2026-27)',
  comparisonText,
  changePercent,
  basisOfCalculation,
  isProfit = false,
}) => {
  const isPositiveChange = changePercent !== undefined && changePercent > 0;
  const isNegativeChange = changePercent !== undefined && changePercent < 0;

  return (
    <div className="bg-white border border-[#E5E5E5] p-3.5 hover:border-[#CCCCCC] transition-colors rounded-none">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium text-[#666666] uppercase tracking-wider">
          {label}
        </span>
        {changePercent !== undefined && (
          <span
            className={cn(
              'inline-flex items-center text-[11px] font-mono font-medium',
              isPositiveChange
                ? 'text-[#137333]'
                : isNegativeChange
                ? 'text-[#C5221F]'
                : 'text-[#666666]'
            )}
          >
            {isPositiveChange ? (
              <ArrowUpRight size={13} className="mr-0.5" />
            ) : isNegativeChange ? (
              <ArrowDownRight size={13} className="mr-0.5" />
            ) : (
              <Minus size={13} className="mr-0.5" />
            )}
            {Math.abs(changePercent)}%
          </span>
        )}
      </div>

      <div className="mt-2 text-xl font-bold tracking-tight text-[#111111]">
        <CurrencyDisplay paise={amountPaise} showSignColor={isProfit} />
      </div>

      <div className="mt-2.5 pt-2 border-t border-[#F0EFEA] flex flex-col gap-0.5 text-[10px] text-[#888888]">
        <div className="flex justify-between items-center">
          <span>{periodText}</span>
          {comparisonText && <span>vs {comparisonText}</span>}
        </div>
        <div className="text-[9px] text-[#999999] truncate" title={basisOfCalculation}>
          Basis: {basisOfCalculation}
        </div>
      </div>
    </div>
  );
};
