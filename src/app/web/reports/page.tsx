'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import {
  calculateProfitAndLoss,
  calculateBalanceSheet,
  calculateTrialBalance,
} from '@/lib/accounting/engine';
import { Download, Printer, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

import {
  exportReportToPdf,
  exportReportToExcel,
  exportReportToCsv,
} from '@/lib/reports/reportGenerator';

export default function ReportsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [activeReport, setActiveReport] = useState<'PNL' | 'BALANCE_SHEET' | 'TRIAL_BALANCE'>('PNL');
  const [period, setPeriod] = useState('FY 2026-27 (YTD)');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const pnl = calculateProfitAndLoss(storeState.accounts);
  const balanceSheet = calculateBalanceSheet(storeState.accounts, pnl.netProfitPaise);
  const trialBalance = calculateTrialBalance(storeState.accounts);

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    if (format === 'excel') {
      exportReportToExcel(activeReport, storeState, period);
    } else if (format === 'csv') {
      exportReportToCsv(activeReport, storeState, period);
    } else if (format === 'pdf') {
      exportReportToPdf(activeReport, storeState, period);
    }
  };

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Accounting & Financial Reports
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Strictly derived from posted general ledger transactions. Formatted to Indian Accounting Standards (Ind AS).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} title="Download formatted multi-column Excel spreadsheet">
            <FileSpreadsheet size={13} /> Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} title="Download CSV for CA audit and accounting software">
            <FileSpreadsheet size={13} /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} title="Export and print official corporate PDF statement">
            <Download size={13} /> Export PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportReportToPdf(activeReport, storeState, period)}>
            <Printer size={13} /> Print
          </Button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex border-b border-[#E5E5E5] gap-1">
        <button
          onClick={() => setActiveReport('PNL')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeReport === 'PNL'
              ? 'border-[#111111] text-[#111111] bg-white'
              : 'border-transparent text-[#666666] hover:text-[#111111]'
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveReport('BALANCE_SHEET')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeReport === 'BALANCE_SHEET'
              ? 'border-[#111111] text-[#111111] bg-white'
              : 'border-transparent text-[#666666] hover:text-[#111111]'
          }`}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveReport('TRIAL_BALANCE')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeReport === 'TRIAL_BALANCE'
              ? 'border-[#111111] text-[#111111] bg-white'
              : 'border-transparent text-[#666666] hover:text-[#111111]'
          }`}
        >
          Trial Balance
        </button>
      </div>

      {/* 1. PROFIT & LOSS STATEMENT */}
      {activeReport === 'PNL' && (
        <Card noPadding>
          <div className="p-4 bg-[#F4F3EF] border-b border-[#E5E5E5] flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                Statement of Profit and Loss
              </h2>
              <p className="text-[11px] text-[#666666]">
                For {storeState.organization?.legalName || storeState.organization?.name || 'Active Entity'} • Period: {period} (Indian Accounting Standards)
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#888888] font-mono block">Accounting Basis</span>
              <span className="text-xs font-semibold text-[#111111]">Accrual Basis (INR)</span>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Revenue Section */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#111111] border-b border-[#111111] pb-1 mb-2">
                I. Revenue from Operations
              </div>
              <div className="space-y-1.5 text-xs">
                {pnl.revenueAccounts.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-[#F0EFEA]">
                    <span className="text-[#333333] pl-3">{item.name}</span>
                    <CurrencyDisplay paise={item.amountPaise} />
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t-2 border-[#E5E5E5] font-bold text-xs bg-[#FAFAF9] px-2">
                  <span>Total Revenue (A)</span>
                  <CurrencyDisplay paise={pnl.totalRevenuePaise} />
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#111111] border-b border-[#111111] pb-1 mb-2">
                II. Operating Expenditure
              </div>
              <div className="space-y-1.5 text-xs">
                {pnl.expenseAccounts.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-[#F0EFEA]">
                    <span className="text-[#333333] pl-3">{item.name}</span>
                    <CurrencyDisplay paise={item.amountPaise} />
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t-2 border-[#E5E5E5] font-bold text-xs bg-[#FAFAF9] px-2">
                  <span>Total Expenses (B)</span>
                  <CurrencyDisplay paise={pnl.operatingExpensesPaise + pnl.directCostsPaise + pnl.taxExpensePaise} />
                </div>
              </div>
            </div>

            {/* Net Profit Summary */}
            <div className="border-t-2 border-black pt-3">
              <div className="flex justify-between items-center py-2 bg-[#E6F4EA] border border-[#CEEAD6] px-3 font-bold text-sm text-[#137333]">
                <span>Net Profit After Tax (A - B)</span>
                <CurrencyDisplay paise={pnl.netProfitPaise} showSignColor />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 2. BALANCE SHEET */}
      {activeReport === 'BALANCE_SHEET' && (
        <Card noPadding>
          <div className="p-4 bg-[#F4F3EF] border-b border-[#E5E5E5] flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                Balance Sheet (Statement of Financial Position)
              </h2>
              <p className="text-[11px] text-[#666666]">
                As at {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {balanceSheet.isBalanced ? (
                <span className="text-[#137333] flex items-center gap-1">
                  <CheckCircle2 size={16} /> Balanced Invariant: Assets = Liabilities + Equity
                </span>
              ) : (
                <span className="text-[#C5221F] flex items-center gap-1">
                  <AlertTriangle size={16} /> Discrepancy Detected
                </span>
              )}
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Assets */}
            <div className="border border-[#E5E5E5] p-3 bg-white">
              <div className="text-xs font-bold uppercase tracking-wider text-[#111111] border-b-2 border-black pb-1 mb-3">
                Assets
              </div>
              <div className="space-y-2 text-xs">
                {balanceSheet.assets.map((asset, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-[#F0EFEA]">
                    <div>
                      <div className="font-medium text-[#222222]">{asset.name}</div>
                      <div className="text-[10px] text-[#888888]">{asset.subType}</div>
                    </div>
                    <CurrencyDisplay paise={asset.amountPaise} />
                  </div>
                ))}
                <div className="flex justify-between py-2.5 border-t-2 border-black font-bold text-xs bg-[#F4F3EF] px-2 mt-4">
                  <span>TOTAL ASSETS</span>
                  <CurrencyDisplay paise={balanceSheet.totalAssetsPaise} />
                </div>
              </div>
            </div>

            {/* Right Column: Liabilities & Equity */}
            <div className="space-y-6">
              {/* Liabilities */}
              <div className="border border-[#E5E5E5] p-3 bg-white">
                <div className="text-xs font-bold uppercase tracking-wider text-[#111111] border-b-2 border-black pb-1 mb-3">
                  Liabilities
                </div>
                <div className="space-y-2 text-xs">
                  {balanceSheet.liabilities.map((liab, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-[#F0EFEA]">
                      <div>
                        <div className="font-medium text-[#222222]">{liab.name}</div>
                        <div className="text-[10px] text-[#888888]">{liab.subType}</div>
                      </div>
                      <CurrencyDisplay paise={liab.amountPaise} />
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 border-t border-[#E5E5E5] font-semibold text-xs bg-[#FAFAF9] px-2">
                    <span>Total Liabilities</span>
                    <CurrencyDisplay paise={balanceSheet.totalLiabilitiesPaise} />
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div className="border border-[#E5E5E5] p-3 bg-white">
                <div className="text-xs font-bold uppercase tracking-wider text-[#111111] border-b-2 border-black pb-1 mb-3">
                  Equity & Reserves
                </div>
                <div className="space-y-2 text-xs">
                  {balanceSheet.equity.map((eq, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-[#F0EFEA]">
                      <div>
                        <div className="font-medium text-[#222222]">{eq.name}</div>
                        <div className="text-[10px] text-[#888888]">{eq.subType}</div>
                      </div>
                      <CurrencyDisplay paise={eq.amountPaise} />
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 border-t border-[#E5E5E5] font-semibold text-xs bg-[#FAFAF9] px-2">
                    <span>Total Equity</span>
                    <CurrencyDisplay paise={balanceSheet.totalEquityPaise} />
                  </div>

                  <div className="flex justify-between py-2.5 border-t-2 border-black font-bold text-xs bg-[#F4F3EF] px-2 mt-4">
                    <span>TOTAL LIABILITIES & EQUITY</span>
                    <CurrencyDisplay paise={balanceSheet.totalLiabilitiesPaise + balanceSheet.totalEquityPaise} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 3. TRIAL BALANCE */}
      {activeReport === 'TRIAL_BALANCE' && (
        <Card noPadding>
          <div className="p-4 bg-[#F4F3EF] border-b border-[#E5E5E5] flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                General Ledger Trial Balance
              </h2>
              <p className="text-[11px] text-[#666666]">
                Double-entry invariant check: Total Debits must equal Total Credits
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {trialBalance.isBalanced ? (
                <span className="text-[#137333] flex items-center gap-1">
                  <CheckCircle2 size={16} /> Balanced Trial Balance
                </span>
              ) : (
                <span className="text-[#C5221F] flex items-center gap-1">
                  <AlertTriangle size={16} /> Out of Balance
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left financial-table">
              <thead>
                <tr>
                  <th className="p-3">Account Code</th>
                  <th className="p-3">Account Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Debit Balance (₹)</th>
                  <th className="p-3 text-right">Credit Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#777777]">
                      <div className="max-w-sm mx-auto space-y-1">
                        <p className="font-semibold text-sm text-[#111111]">No Ledger Accounts</p>
                        <p className="text-xs text-[#888888]">
                          Initialize the Chart of Accounts or create ledger accounts to inspect the live Trial Balance.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  trialBalance.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAF9]">
                      <td className="p-3 font-mono text-xs font-bold">{row.accountCode}</td>
                      <td className="p-3 text-xs text-[#222222] font-medium">{row.accountName}</td>
                      <td className="p-3 text-xs text-[#666666]">{row.type}</td>
                      <td className="p-3 text-right num-tabular text-xs">
                        {row.debitPaise > 0 ? <CurrencyDisplay paise={row.debitPaise} /> : '—'}
                      </td>
                      <td className="p-3 text-right num-tabular text-xs">
                        {row.creditPaise > 0 ? <CurrencyDisplay paise={row.creditPaise} /> : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-[#F4F3EF] border-t-2 border-black font-bold">
                <tr>
                  <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-xs">
                    Grand Totals
                  </td>
                  <td className="p-3 text-right num-tabular text-xs">
                    <CurrencyDisplay paise={trialBalance.totalDebitPaise} />
                  </td>
                  <td className="p-3 text-right num-tabular text-xs">
                    <CurrencyDisplay paise={trialBalance.totalCreditPaise} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </WebLayout>
  );
}
