'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { BalancedJournalModal } from '@/components/finance/BalancedJournalModal';
import { globalDataStore } from '@/lib/store/dataStore';
import { JournalEntry } from '@/types';
import { formatDate } from '@/lib/utils';
import { Plus, RotateCcw, Search, Eye } from 'lucide-react';

export default function JournalsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleReverse = (entry: JournalEntry) => {
    const reason = window.prompt(
      `Enter formal reason for reversing journal entry ${entry.entryNumber}:`,
      'Correction of accounting entry discrepancy'
    );
    if (!reason) return;

    const res = globalDataStore.reverseJournal(entry.id, reason);
    if (res.success) {
      alert(`Entry ${entry.entryNumber} successfully reversed. Created reversing entry ${res.reversalEntry?.entryNumber}.`);
    } else {
      alert(`Failed to reverse entry: ${res.error}`);
    }
  };

  const filteredEntries = storeState.journalEntries.filter((j) => {
    const q = searchQuery.toLowerCase();
    return (
      j.entryNumber.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      (j.reference && j.reference.toLowerCase().includes(q))
    );
  });

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Double-Entry Journal Entries
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Immutable general journal entries. Total debits must equal credits before posting.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus size={13} /> New Journal Entry
        </Button>
      </div>

      {/* Search and Table */}
      <Card noPadding>
        <div className="p-3 border-b border-[#E5E5E5] flex items-center gap-3 bg-[#FFFFFF]">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#888888]" />
            <input
              type="text"
              placeholder="Search by entry #, narration, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F3EF] border border-[#CCCCCC] pl-8 pr-3 py-1.5 text-xs outline-none focus:border-black"
            />
          </div>
          <span className="text-[11px] text-[#777777] ml-auto">
            Showing {filteredEntries.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Posting Date</th>
                <th className="p-3">Entry #</th>
                <th className="p-3">Narration / Description</th>
                <th className="p-3">Reference</th>
                <th className="p-3 text-right">Debit Total</th>
                <th className="p-3 text-right">Credit Total</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-[#777777]">
                    <div className="max-w-sm mx-auto space-y-1">
                      <p className="font-semibold text-sm text-[#111111]">No Journal Entries Recorded</p>
                      <p className="text-xs text-[#888888]">
                        Click &ldquo;New Journal Entry&rdquo; above to record balanced general ledger transactions.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr className="hover:bg-[#FAFAF9]">
                    <td className="p-3 text-xs text-[#555555] whitespace-nowrap">
                      {formatDate(entry.entryDate)}
                    </td>
                    <td className="p-3 font-mono text-xs font-bold text-[#111111]">
                      {entry.entryNumber}
                    </td>
                    <td className="p-3 text-xs text-[#222222]">
                      <div>{entry.description}</div>
                      {entry.reversalOfEntryId && (
                        <span className="text-[10px] text-[#C5221F] font-mono mt-0.5 inline-block">
                          Reversal of Entry ID {entry.reversalOfEntryId}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs font-mono text-[#666666]">
                      {entry.reference || '—'}
                    </td>
                    <td className="p-3 text-right num-tabular text-xs font-medium">
                      <CurrencyDisplay paise={entry.totalDebitPaise} />
                    </td>
                    <td className="p-3 text-right num-tabular text-xs font-medium">
                      <CurrencyDisplay paise={entry.totalCreditPaise} />
                    </td>
                    <td className="p-3 text-center">
                      <Badge status={entry.status} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                          title="View Lines"
                        >
                          <Eye size={13} />
                        </Button>
                        {entry.status === 'Posted' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReverse(entry)}
                            title="Reverse posted journal entry"
                            className="text-[#C5221F] hover:bg-[#FCE8E6]"
                          >
                            <RotateCcw size={12} /> Reverse
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Line Items Drawer */}
                  {selectedEntry?.id === entry.id && (
                    <tr className="bg-[#FAFAF9]">
                      <td colSpan={8} className="p-4 border-b border-[#E5E5E5]">
                        <div className="bg-white border border-[#E5E5E5] p-3 text-xs">
                          <div className="font-semibold text-xs mb-2 text-[#333333] flex justify-between">
                            <span>Journal Lines ({entry.lines.length} splits)</span>
                            <span className="text-[#888888] font-normal font-mono">
                              Posted by {entry.createdByName || 'System'} at {formatDate(entry.entryDate)}
                            </span>
                          </div>
                          <table className="w-full text-left financial-table">
                            <thead>
                              <tr>
                                <th className="p-2">Account Code & Name</th>
                                <th className="p-2">Line Description</th>
                                <th className="p-2 text-right">Debit (₹)</th>
                                <th className="p-2 text-right">Credit (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entry.lines.map((l, i) => (
                                <tr key={i}>
                                  <td className="p-2 font-medium">
                                    {l.accountCode} - {l.accountName}
                                  </td>
                                  <td className="p-2 text-[#666666]">{l.description || '—'}</td>
                                  <td className="p-2 text-right num-tabular">
                                    {l.debitPaise > 0 ? <CurrencyDisplay paise={l.debitPaise} /> : '—'}
                                  </td>
                                  <td className="p-2 text-right num-tabular">
                                    {l.creditPaise > 0 ? <CurrencyDisplay paise={l.creditPaise} /> : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )))}
            </tbody>
          </table>
        </div>
      </Card>

      <BalancedJournalModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </WebLayout>
  );
}
