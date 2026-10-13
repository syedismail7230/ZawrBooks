'use client';

import React from 'react';
import { formatINR } from '@/lib/accounting/engine';

export interface MonthlyFinancialData {
  month: string;
  revenuePaise: number;
  expensePaise: number;
  netProfitPaise: number;
}

/**
 * Clean Zerodha-style Revenue vs Expenses Bar Chart
 * Renders purely from real user transactions. Displays clean empty state if no postings exist.
 */
export const RevenueExpenseChart: React.FC<{ data?: MonthlyFinancialData[] }> = ({
  data = [],
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center border border-dashed border-[#E5E5E5] bg-[#FAFAF9] text-xs text-[#777777] p-4 text-center">
        <p className="font-medium text-[#444444]">No financial postings recorded yet</p>
        <p className="text-[11px] text-[#888888] mt-1">
          Issue invoices or post journal entries to visualize real monthly revenue and expenditure.
        </p>
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.revenuePaise, d.expensePaise))) * 1.15;
  const height = 180;
  const width = 500;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#111111] inline-block" />
            <span className="text-[#666666] font-medium">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#E5E5E5] border border-[#CCCCCC] inline-block" />
            <span className="text-[#666666] font-medium">Expenses</span>
          </div>
        </div>
        <span className="text-[11px] text-[#888888]">Monthly (FY 2026-27)</span>
      </div>

      <div className="relative border-b border-[#E5E5E5] pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = height - pct * (height - 20);
            return (
              <g key={idx}>
                <line
                  x1="0"
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="#F0EFEA"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <text
                  x="2"
                  y={y - 3}
                  fontSize="8"
                  fill="#999999"
                  fontFamily="monospace"
                >
                  {formatINR(Math.round(maxVal * pct), false)}
                </text>
              </g>
            );
          })}

          {data.map((item, idx) => {
            const colWidth = width / data.length;
            const barWidth = 14;
            const groupX = idx * colWidth + colWidth / 2 - barWidth;

            const revH = (item.revenuePaise / maxVal) * (height - 20);
            const expH = (item.expensePaise / maxVal) * (height - 20);

            const revY = height - revH;
            const expY = height - expH;

            return (
              <g key={idx} className="group cursor-pointer">
                <rect
                  x={groupX - 1}
                  y={revY}
                  width={barWidth}
                  height={revH}
                  fill="#111111"
                />
                <rect
                  x={groupX + barWidth + 2}
                  y={expY}
                  width={barWidth}
                  height={expH}
                  fill="#E5E5E5"
                  stroke="#CCCCCC"
                  strokeWidth="1"
                />
                <text
                  x={groupX + barWidth}
                  y={height + 15}
                  fontSize="10"
                  textAnchor="middle"
                  fill="#555555"
                >
                  {item.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/**
 * Net Profit Trend Line Chart
 * Renders purely from real user transactions. Displays clean empty state if no postings exist.
 */
export const NetProfitTrendChart: React.FC<{ data?: MonthlyFinancialData[] }> = ({
  data = [],
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center border border-dashed border-[#E5E5E5] bg-[#FAFAF9] text-xs text-[#777777] p-4 text-center">
        <p className="font-medium text-[#444444]">No profit history available</p>
        <p className="text-[11px] text-[#888888] mt-1">
          Post revenue and expense entries to track net profit margin over time.
        </p>
      </div>
    );
  }

  const maxProfit = Math.max(1, ...data.map((d) => d.netProfitPaise)) * 1.2;
  const height = 180;
  const width = 500;

  const points = data
    .map((d, idx) => {
      const colWidth = width / Math.max(1, data.length - 1);
      const x = idx * colWidth;
      const y = height - (d.netProfitPaise / maxProfit) * (height - 30);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1.5 bg-[#137333] inline-block" />
          <span className="text-[#137333] font-semibold">Net Profit Margin</span>
        </div>
        <span className="text-[11px] text-[#888888]">Post-tax Realized (Paise)</span>
      </div>

      <div className="relative border-b border-[#E5E5E5] pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {[0, 0.5, 1].map((pct, idx) => {
            const y = height - pct * (height - 30);
            return (
              <line
                key={idx}
                x1="0"
                y1={y}
                x2={width}
                y2={y}
                stroke="#F0EFEA"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
            );
          })}

          <polyline
            fill="none"
            stroke="#137333"
            strokeWidth="2"
            points={points}
            strokeLinejoin="round"
          />

          {data.map((d, idx) => {
            const colWidth = width / Math.max(1, data.length - 1);
            const x = idx * colWidth;
            const y = height - (d.netProfitPaise / maxProfit) * (height - 30);
            return (
              <g key={idx}>
                <circle cx={x} cy={y} r="3" fill="#137333" />
                <text
                  x={x}
                  y={height + 15}
                  fontSize="10"
                  textAnchor="middle"
                  fill="#555555"
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
