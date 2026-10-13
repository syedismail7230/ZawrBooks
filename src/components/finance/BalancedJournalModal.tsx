'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { Account, JournalLine } from '@/types';
import { validateJournalBalance, rupeesToPaise } from '@/lib/accounting/engine';
import { Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface BalancedJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BalancedJournalModal: React.FC<BalancedJournalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const store = globalDataStore.getState();
  const accounts: Account[] = store.accounts;

  const [entryNumber, setEntryNumber] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEntryNumber(`JE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setEntryDate(new Date().toISOString().split('T')[0]);
      if (accounts.length >= 2) {
        setLines([
          { accountId: accounts[0]?.id || '', debitRupees: '', creditRupees: '', description: '' },
          { accountId: accounts[1]?.id || '', debitRupees: '', creditRupees: '', description: '' },
        ]);
      } else if (accounts.length === 1) {
        setLines([
          { accountId: accounts[0].id, debitRupees: '', creditRupees: '', description: '' },
          { accountId: accounts[0].id, debitRupees: '', creditRupees: '', description: '' },
        ]);
      }
    }
  }, [isOpen, accounts]);

  const [lines, setLines] = useState<Array<{
    accountId: string;
    debitRupees: string;
    creditRupees: string;
    description: string;
  }>>([
    { accountId: accounts[0]?.id || '', debitRupees: '', creditRupees: '', description: '' },
    { accountId: accounts[1]?.id || '', debitRupees: '', creditRupees: '', description: '' },
  ]);

  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Convert raw rupee strings to paise lines for validation
  const parsedJournalLines: JournalLine[] = lines.map((l, index) => {
    const acc = accounts.find((a) => a.id === l.accountId);
    return {
      id: `jl-temp-${index}`,
      accountId: l.accountId,
      accountName: acc?.name,
      accountCode: acc?.code,
      debitPaise: rupeesToPaise(l.debitRupees),
      creditPaise: rupeesToPaise(l.creditRupees),
      description: l.description,
    };
  });

  const validation = validateJournalBalance(parsedJournalLines);

  const handleAddLine = () => {
    setLines([
      ...lines,
      { accountId: accounts[0]?.id || '', debitRupees: '0', creditRupees: '0', description: '' },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const handlePost = () => {
    if (!description.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a description for this journal entry.' });
      return;
    }

    if (!validation.isBalanced) {
      setStatusMessage({
        type: 'error',
        text: validation.errorMessage || 'Journal entry is not balanced.',
      });
      return;
    }

    const res = globalDataStore.postJournal({
      id: `je-${Date.now()}`,
      organizationId: store.organization?.id || 'org-active',
      entryNumber,
      entryDate: entryDate || new Date().toISOString().split('T')[0],
      status: 'Draft',
      description,
      reference,
      lines: parsedJournalLines,
      createdBy: store.currentUser?.id || 'usr-active',
      createdByName: store.currentUser?.fullName || 'Current User',
      totalDebitPaise: validation.totalDebitPaise,
      totalCreditPaise: validation.totalCreditPaise,
    });

    if (res.success) {
      setStatusMessage({ type: 'success', text: `Journal entry ${entryNumber} successfully posted!` });
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to post entry.' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Double-Entry Journal"
      subtitle="Total debits must strictly equal total credits to preserve ledger balance"
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {statusMessage && (
          <div
            className={`p-2.5 border text-xs font-medium ${
              statusMessage.type === 'error'
                ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
                : 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Top Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#F4F3EF] p-3 border border-[#E5E5E5]">
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Entry Number
            </label>
            <input
              type="text"
              value={entryNumber}
              onChange={(e) => setEntryNumber(e.target.value)}
              className="w-full bg-white border border-[#CCCCCC] px-2 py-1 text-xs font-mono focus:border-black outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Posting Date
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full bg-white border border-[#CCCCCC] px-2 py-1 text-xs focus:border-black outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Reference / Document ID
            </label>
            <input
              type="text"
              placeholder="e.g. VOUCH-0881"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-white border border-[#CCCCCC] px-2 py-1 text-xs focus:border-black outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Description / Narration
            </label>
            <input
              type="text"
              placeholder="e.g. Month-end depreciation adjustment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-[#CCCCCC] px-2 py-1 text-xs focus:border-black outline-none"
            />
          </div>
        </div>

        {/* Journal Lines Table */}
        <div className="border border-[#E5E5E5]">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-2 w-10">#</th>
                <th className="p-2 w-1/3">Account (Chart of Accounts)</th>
                <th className="p-2">Line Narration</th>
                <th className="p-2 w-28 text-right">Debit (₹)</th>
                <th className="p-2 w-28 text-right">Credit (₹)</th>
                <th className="p-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td className="p-2 text-[#777777] font-mono text-[11px]">{idx + 1}</td>
                  <td className="p-2">
                    <select
                      value={line.accountId}
                      onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                      className="w-full bg-white border border-[#E0E0E0] p-1 text-xs focus:border-black outline-none"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Optional line memo"
                      value={line.description}
                      onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                      className="w-full bg-white border border-[#E0E0E0] p-1 text-xs focus:border-black outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debitRupees}
                      onChange={(e) => handleLineChange(idx, 'debitRupees', e.target.value)}
                      className="w-full bg-white border border-[#E0E0E0] p-1 text-xs text-right font-mono focus:border-black outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.creditRupees}
                      onChange={(e) => handleLineChange(idx, 'creditRupees', e.target.value)}
                      className="w-full bg-white border border-[#E0E0E0] p-1 text-xs text-right font-mono focus:border-black outline-none"
                    />
                  </td>
                  <td className="p-2 text-center">
                    {lines.length > 2 && (
                      <button
                        onClick={() => handleRemoveLine(idx)}
                        className="text-[#999999] hover:text-[#C5221F] p-1"
                        title="Delete line"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals & Invariant Verification Footer */}
            <tfoot className="bg-[#F4F3EF] border-t-2 border-[#111111] font-semibold">
              <tr>
                <td colSpan={3} className="p-2 text-right uppercase tracking-wider text-[11px]">
                  Totals
                </td>
                <td className="p-2 text-right num-tabular text-xs">
                  <CurrencyDisplay paise={validation.totalDebitPaise} />
                </td>
                <td className="p-2 text-right num-tabular text-xs">
                  <CurrencyDisplay paise={validation.totalCreditPaise} />
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Balance Status & Action bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLine}
            className="w-full sm:w-auto"
          >
            <Plus size={13} /> Add Journal Line
          </Button>

          <div className="flex items-center gap-4">
            {validation.isBalanced ? (
              <div className="flex items-center gap-1.5 text-[#137333] text-xs font-medium">
                <CheckCircle2 size={16} /> Balanced Invariant Satisfied
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[#C5221F] text-xs font-medium">
                <AlertTriangle size={16} />
                Discrepancy: <CurrencyDisplay paise={validation.differencePaise} />
              </div>
            )}

            <Button
              variant="primary"
              onClick={handlePost}
              disabled={!validation.isBalanced}
            >
              Post Journal Entry
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
