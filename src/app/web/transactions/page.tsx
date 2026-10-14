'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { formatDate } from '@/lib/utils';
import { Search, Download, Filter, FileSpreadsheet } from 'lucide-react';
import { exportReportToExcel, exportReportToCsv } from '@/lib/reports/reportGenerator';

export default function TransactionsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  // Compile full unified transaction register from journals
  const transactions = storeState.journalEntries.flatMap((je) =>
    je.lines.map((l) => ({
      id: `${je.id}-${l.id}`,
      date: je.entryDate,
      entryNumber: je.entryNumber,
      accountCode: l.accountCode,
      accountName: l.accountName,
      description: l.description || je.description,
      debitPaise: l.debitPaise,
      creditPaise: l.creditPaise,
      status: je.status,
      postedBy: je.createdByName || 'System',
    }))
  );

  const filtered = transactions.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.entryNumber.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.accountName && t.accountName.toLowerCase().includes(q))
    );
  });

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Transaction Register
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Searchable financial transaction register linked to double-entry general ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportReportToExcel('TRANSACTIONS', storeState)}
            className="px-3 py-1.5 border border-[#CCCCCC] hover:border-black text-xs font-medium bg-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download formatted multi-column Excel spreadsheet"
          >
            <FileSpreadsheet size={13} /> Export Excel
          </button>
          <button
            onClick={() => exportReportToCsv('TRANSACTIONS', storeState)}
            className="px-3 py-1.5 border border-[#CCCCCC] hover:border-black text-xs font-medium bg-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV file for CA and ledger audits"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <Card noPadding>
        <div className="p-3 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#888888]" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F3EF] border border-[#CCCCCC] pl-8 pr-3 py-1.5 text-xs outline-none focus:border-black"
            />
          </div>
          <span className="text-[11px] text-[#777777]">
            {filtered.length} split transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Journal Entry</th>
                <th className="p-3">Account</th>
                <th className="p-3">Description / Narration</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Posted By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-[#777777]">
                    <div className="max-w-sm mx-auto space-y-1">
                      <p className="font-semibold text-sm text-[#111111]">No Transactions Recorded</p>
                      <p className="text-xs text-[#888888]">
                        Split transaction rows will automatically appear here once balanced journal entries or bills are posted.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#FAFAF9]">
                    <td className="p-3 text-xs text-[#555555] font-mono whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="p-3 font-mono text-xs font-bold text-[#111111]">
                      {tx.entryNumber}
                    </td>
                    <td className="p-3 text-xs font-medium text-[#222222]">
                      {tx.accountCode} - {tx.accountName}
                    </td>
                    <td className="p-3 text-xs text-[#444444] max-w-sm truncate">
                      {tx.description}
                    </td>
                    <td className="p-3 text-right num-tabular text-xs">
                      {tx.debitPaise > 0 ? <CurrencyDisplay paise={tx.debitPaise} /> : '—'}
                    </td>
                    <td className="p-3 text-right num-tabular text-xs">
                      {tx.creditPaise > 0 ? <CurrencyDisplay paise={tx.creditPaise} /> : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge status={tx.status} />
                    </td>
                    <td className="p-3 text-xs text-[#666666]">{tx.postedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </WebLayout>
  );
}
