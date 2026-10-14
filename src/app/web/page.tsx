'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { FinancialKPICard } from '@/components/finance/FinancialKPICard';
import { RevenueExpenseChart, NetProfitTrendChart, MonthlyFinancialData } from '@/components/charts/FinancialCharts';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { calculateProfitAndLoss, calculateBalanceSheet } from '@/lib/accounting/engine';
import { formatDate } from '@/lib/utils';
import { Filter, Plus, ArrowUpRight, Building2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function OverviewPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [selectedFY, setSelectedFY] = useState('2026-27');

  // Org Setup Form State
  const [orgName, setOrgName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');

  useEffect(() => {
    globalDataStore.syncWithServer();
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleInitOrg = () => {
    if (!orgName.trim()) {
      alert('Please enter your business or trading name.');
      return;
    }
    globalDataStore.setOrganization({
      name: orgName.trim(),
      legalName: (legalName || orgName).trim(),
      gstin: gstin.trim() || '',
      pan: pan.trim() || '',
    });
  };

  const handleCreateDefaultLedgers = () => {
    const standardAccounts = [
      { code: '1010', name: 'Petty Cash', type: 'Asset' as const, subType: 'Cash on Hand', currency: 'INR', isActive: true },
      { code: '1020', name: 'Main Operating Bank Account', type: 'Asset' as const, subType: 'Bank Accounts', currency: 'INR', isActive: true },
      { code: '1100', name: 'Accounts Receivable (Trade Debtors)', type: 'Asset' as const, subType: 'Current Assets', currency: 'INR', isActive: true },
      { code: '1200', name: 'Input CGST Tax Credit', type: 'Asset' as const, subType: 'GST Input Credit', currency: 'INR', isActive: true },
      { code: '1210', name: 'Input SGST Tax Credit', type: 'Asset' as const, subType: 'GST Input Credit', currency: 'INR', isActive: true },
      { code: '1220', name: 'Input IGST Tax Credit', type: 'Asset' as const, subType: 'GST Input Credit', currency: 'INR', isActive: true },
      { code: '2010', name: 'Accounts Payable (Trade Creditors)', type: 'Liability' as const, subType: 'Current Liabilities', currency: 'INR', isActive: true },
      { code: '2100', name: 'Output CGST Payable', type: 'Liability' as const, subType: 'Tax Liabilities', currency: 'INR', isActive: true },
      { code: '2110', name: 'Output SGST Payable', type: 'Liability' as const, subType: 'Tax Liabilities', currency: 'INR', isActive: true },
      { code: '3010', name: 'Shareholder Capital', type: 'Equity' as const, subType: 'Equity Capital', currency: 'INR', isActive: true },
      { code: '4010', name: 'Primary Operating Revenue', type: 'Revenue' as const, subType: 'Operating Revenue', currency: 'INR', isActive: true },
      { code: '5010', name: 'Operating & Administrative Expenses', type: 'Expense' as const, subType: 'Operating Expense', currency: 'INR', isActive: true },
    ];

    for (const acc of standardAccounts) {
      if (!storeState.accounts.some((a) => a.code === acc.code)) {
        globalDataStore.addAccount(acc);
      }
    }
  };

  // Compute live financial totals strictly from real posted accounts
  const pnl = calculateProfitAndLoss(storeState.accounts);
  const balanceSheet = calculateBalanceSheet(storeState.accounts, pnl.netProfitPaise);

  const cashAndBankPaise = storeState.accounts
    .filter((a) => a.type === 'Asset' && (a.subType.toLowerCase().includes('cash') || a.subType.toLowerCase().includes('bank')))
    .reduce((sum, a) => sum + a.balancePaise, 0);

  const receivablesPaise = storeState.accounts
    .find((a) => a.code === '1100')?.balancePaise || 0;

  const payablesPaise = storeState.accounts
    .find((a) => a.code === '2010')?.balancePaise || 0;

  const overdueInvoicesCount = storeState.invoices.filter((i) => i.status === 'Overdue').length;

  const upcomingPayablesPaise = storeState.vendorBills
    .filter((b) => b.status !== 'Paid')
    .reduce((sum, b) => sum + (b.totalPaise - b.amountPaidPaise), 0);

  // Compute real monthly chart data from actual posted entries
  const monthlyData: MonthlyFinancialData[] = [];
  if (storeState.journalEntries.length > 0) {
    const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    for (const m of monthNames) {
      const monthEntries = storeState.journalEntries.filter((j) => {
        const d = new Date(j.entryDate);
        const name = d.toLocaleString('en-IN', { month: 'short' });
        return name === m;
      });
      if (monthEntries.length > 0) {
        let rev = 0;
        let exp = 0;
        for (const j of monthEntries) {
          for (const l of j.lines) {
            const acc = storeState.accounts.find((a) => a.id === l.accountId);
            if (acc?.type === 'Revenue') rev += l.creditPaise;
            if (acc?.type === 'Expense') exp += l.debitPaise;
          }
        }
        monthlyData.push({
          month: m,
          revenuePaise: rev,
          expensePaise: exp,
          netProfitPaise: rev - exp,
        });
      }
    }
  }

  return (
    <WebLayout>
      {/* Onboarding Banner if Organization not set */}
      {!storeState.organization ? (
        <Card title="Initialize Your Organization Profile">
          <div className="space-y-4 text-xs">
            <p className="text-[#555555]">
              No mock data is loaded. Please enter your real business details below to initialize your organization workspace.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Business / Trading Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Your Business Name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Registered Legal Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Your Business LLP / Pvt Ltd"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  placeholder="15-character GSTIN"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  PAN
                </label>
                <input
                  type="text"
                  placeholder="10-character PAN"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="primary" size="md" onClick={handleInitOrg}>
                Initialize Organization Profile
              </Button>
            </div>
          </div>
        </Card>
      ) : storeState.accounts.length === 0 ? (
        <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <div className="text-xs font-bold text-[#111111]">
              Organization: {storeState.organization.name}
            </div>
            <div className="text-[11px] text-[#666666]">
              Your Chart of Accounts is currently empty. Initialize standard ledger categories to start posting transactions.
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={handleCreateDefaultLedgers}>
            <Plus size={13} /> Initialize Standard Chart of Accounts
          </Button>
        </div>
      ) : null}

      {/* Header and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Executive Financial Overview
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Real-time financial performance and accounting balances for {storeState.organization?.name || 'Your Company'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-[#CCCCCC] px-2.5 py-1 text-xs">
            <Filter size={13} className="text-[#666666]" />
            <span className="text-[#777777]">FY:</span>
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="bg-transparent font-medium outline-none cursor-pointer"
            >
              <option value="2026-27">FY 2026-27 (Current)</option>
              <option value="2025-26">FY 2025-26</option>
            </select>
          </div>
        </div>
      </div>

      {/* 8 Financial KPI Cards purely from real balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FinancialKPICard
          label="Total Operating Revenue"
          amountPaise={pnl.totalRevenuePaise}
          basisOfCalculation="Credit balances of Posted Revenue Accounts"
        />

        <FinancialKPICard
          label="Total Operating Expenses"
          amountPaise={pnl.operatingExpensesPaise + pnl.directCostsPaise}
          basisOfCalculation="Debit balances of Posted Expense Accounts"
        />

        <FinancialKPICard
          label="Net Realized Profit"
          amountPaise={pnl.netProfitPaise}
          basisOfCalculation="Total Revenue less Operating Expenses"
          isProfit={true}
        />

        <FinancialKPICard
          label="Cash & Bank Balances"
          amountPaise={cashAndBankPaise}
          basisOfCalculation="Aggregated Petty Cash and Bank Ledgers"
        />

        <FinancialKPICard
          label="Accounts Receivable (Sundry Debtors)"
          amountPaise={receivablesPaise}
          basisOfCalculation="Outstanding customer invoices in Ledger 1100"
        />

        <FinancialKPICard
          label="Accounts Payable (Trade Creditors)"
          amountPaise={payablesPaise}
          basisOfCalculation="Outstanding vendor bills in Ledger 2010"
        />

        <FinancialKPICard
          label="Overdue Customer Invoices"
          amountPaise={0}
          periodText={`${overdueInvoicesCount} invoices past due`}
          basisOfCalculation="Issued customer invoices past contractual due dates"
        />

        <FinancialKPICard
          label="Upcoming Payables"
          amountPaise={upcomingPayablesPaise}
          basisOfCalculation="Approved vendor bills awaiting settlement"
        />
      </div>

      {/* Financial Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Revenue vs Expenses Performance" subtitle="Monthly operating expenditure vs recognized income">
          <RevenueExpenseChart data={monthlyData} />
        </Card>

        <Card title="Net Profit Trajectory" subtitle="Post-tax realized earnings trend">
          <NetProfitTrendChart data={monthlyData} />
        </Card>
      </div>

      {/* Operational Grids: Recent Transactions & Awaiting Approval */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Posted Journal Entries */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Posted Journal Transactions"
            subtitle="Immutable double-entry general ledger transactions"
            headerAction={
              <Link href="/web/journals" className="text-xs text-[#111111] hover:underline flex items-center gap-1">
                View All <ArrowUpRight size={12} />
              </Link>
            }
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left financial-table">
                <thead>
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Entry #</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-right">Debit</th>
                    <th className="p-2.5 text-right">Credit</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {storeState.journalEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-[#888888]">
                        No posted transactions recorded yet. Click &quot;Post Journal&quot; to commit your first balanced entry.
                      </td>
                    </tr>
                  ) : (
                    storeState.journalEntries.slice(0, 5).map((entry) => (
                      <tr key={entry.id}>
                        <td className="p-2.5 text-xs text-[#555555] whitespace-nowrap">
                          {formatDate(entry.entryDate)}
                        </td>
                        <td className="p-2.5 font-mono text-xs font-medium">
                          {entry.entryNumber}
                        </td>
                        <td className="p-2.5 text-xs text-[#222222] truncate max-w-xs">
                          {entry.description}
                        </td>
                        <td className="p-2.5 text-right num-tabular text-xs">
                          <CurrencyDisplay paise={entry.totalDebitPaise} />
                        </td>
                        <td className="p-2.5 text-right num-tabular text-xs">
                          <CurrencyDisplay paise={entry.totalCreditPaise} />
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge status={entry.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Expenses Awaiting Review */}
        <div>
          <Card
            title="Expenses Under Review"
            subtitle="Receipts and bills pending approval"
            headerAction={
              <Link href="/web/approvals" className="text-xs text-[#111111] hover:underline flex items-center gap-1">
                Queue <ArrowUpRight size={12} />
              </Link>
            }
            noPadding
          >
            <div className="divide-y divide-[#E5E5E5]">
              {storeState.expenses.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#888888]">
                  No pending expenses awaiting approval.
                </div>
              ) : (
                storeState.expenses.slice(0, 4).map((exp) => (
                  <div key={exp.id} className="p-3 hover:bg-[#FAFAF9] transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-[#111111] truncate max-w-[180px]">
                          {exp.vendorName}
                        </div>
                        <div className="text-[11px] text-[#666666]">
                          {exp.employeeName} • {exp.category}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold num-tabular">
                          <CurrencyDisplay paise={exp.grandTotalPaise} />
                        </div>
                        <Badge status={exp.status} className="mt-1" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

    </WebLayout>
  );
}
