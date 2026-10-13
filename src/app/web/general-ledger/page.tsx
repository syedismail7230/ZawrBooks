'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { formatDate } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

export default function GeneralLedgerPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      const s = globalDataStore.getState();
      setStoreState({ ...s });
      if (!selectedAccountId && s.accounts.length > 0) {
        setSelectedAccountId(s.accounts[0].id);
      }
    });
  }, [selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId && storeState.accounts.length > 0) {
      setSelectedAccountId(storeState.accounts[0].id);
    }
  }, [selectedAccountId, storeState.accounts]);

  const selectedAccount = storeState.accounts.find((a) => a.id === selectedAccountId);

  // Extract ledger lines matching this account
  const ledgerLines = storeState.journalEntries.flatMap((je) =>
    je.lines
      .filter((l) => l.accountId === selectedAccountId)
      .map((l) => ({
        entryDate: je.entryDate,
        entryNumber: je.entryNumber,
        description: l.description || je.description,
        debitPaise: l.debitPaise,
        creditPaise: l.creditPaise,
        status: je.status,
      }))
  );

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            General Ledger Drill-Down
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Individual account ledger activity with debit, credit, and running balance tracking
          </p>
        </div>

        {/* Account Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#555555]">Select Ledger Account:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-white border border-[#CCCCCC] p-1.5 text-xs outline-none focus:border-black font-medium"
          >
            {storeState.accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name} ({acc.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {storeState.accounts.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-[#777777] space-y-2">
            <BookOpen size={28} className="mx-auto text-[#AAAAAA]" />
            <p className="font-semibold text-sm text-[#111111]">No Ledger Accounts Configured</p>
            <p className="text-xs text-[#888888]">
              Your Chart of Accounts is currently empty. Visit the Accounts page to initialize standard ledgers or create your own.
            </p>
            <a
              href="/web/accounts"
              className="inline-block px-3 py-1.5 bg-black text-white text-xs font-medium uppercase tracking-wider hover:bg-[#333333]"
            >
              Go to Chart of Accounts
            </a>
          </div>
        </Card>
      ) : selectedAccount ? (
        <Card
          title={`${selectedAccount.code} — ${selectedAccount.name}`}
          subtitle={`Classification: ${selectedAccount.type} (${selectedAccount.subType})`}
          headerAction={
            <div className="text-right">
              <span className="text-[10px] text-[#777777] uppercase block">Closing Ledger Balance</span>
              <CurrencyDisplay paise={selectedAccount.balancePaise} className="text-sm font-bold text-[#111111]" />
            </div>
          }
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left financial-table">
              <thead>
                <tr>
                  <th className="p-3">Posting Date</th>
                  <th className="p-3">Journal Ref</th>
                  <th className="p-3">Particulars / Narration</th>
                  <th className="p-3 text-right">Debit (₹)</th>
                  <th className="p-3 text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {ledgerLines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-[#888888]">
                      No posted transaction movements recorded for this account in the current period.
                    </td>
                  </tr>
                ) : (
                  ledgerLines.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAF9]">
                      <td className="p-3 text-xs text-[#555555] font-mono">
                        {formatDate(row.entryDate)}
                      </td>
                      <td className="p-3 font-mono text-xs font-bold text-[#111111]">
                        {row.entryNumber}
                      </td>
                      <td className="p-3 text-xs text-[#222222]">{row.description}</td>
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
            </table>
          </div>
        </Card>
      ) : null}
    </WebLayout>
  );
}
