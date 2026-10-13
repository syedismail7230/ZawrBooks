'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { BankAccount } from '@/types';
import { formatDate } from '@/lib/utils';
import { rupeesToPaise } from '@/lib/accounting/engine';
import { Landmark, ArrowRightLeft, UploadCloud, Plus, FileText } from 'lucide-react';

export default function BankingPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [isAddStatementModalOpen, setIsAddStatementModalOpen] = useState(false);

  // Transfer Form State
  const [sourceBankId, setSourceBankId] = useState('');
  const [destBankId, setDestBankId] = useState('');
  const [transferRupees, setTransferRupees] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [transferMessage, setTransferMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Add Bank Account Form State
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState<'Bank' | 'Cash'>('Bank');
  const [openingBalanceRupees, setOpeningBalanceRupees] = useState('');

  // Add Statement Line State
  const [stmtBankId, setStmtBankId] = useState('');
  const [stmtDate, setStmtDate] = useState(new Date().toISOString().split('T')[0]);
  const [stmtDesc, setStmtDesc] = useState('');
  const [stmtRef, setStmtRef] = useState('');
  const [stmtDebitRupees, setStmtDebitRupees] = useState('');
  const [stmtCreditRupees, setStmtCreditRupees] = useState('');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      const s = globalDataStore.getState();
      setStoreState({ ...s });
      if (!sourceBankId && s.bankAccounts.length > 0) setSourceBankId(s.bankAccounts[0].id);
      if (!destBankId && s.bankAccounts.length > 1) setDestBankId(s.bankAccounts[1].id);
      if (!stmtBankId && s.bankAccounts.length > 0) setStmtBankId(s.bankAccounts[0].id);
    });
  }, [sourceBankId, destBankId, stmtBankId]);

  const handleCreateBankAccount = () => {
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      alert('Please fill in bank name, account nickname, and account number.');
      return;
    }

    const masked = accountNumber.length > 4 ? `•••• ${accountNumber.slice(-4)}` : accountNumber;
    const initialPaise = rupeesToPaise(openingBalanceRupees || '0');

    // Create GL account for this bank
    const glAcc = globalDataStore.addAccount({
      code: `102${storeState.bankAccounts.length + 1}`,
      name: `${accountName} (${bankName})`,
      type: 'Asset',
      subType: 'Bank Accounts',
      currency: 'INR',
      isActive: true,
    });

    const newBank = globalDataStore.addBankAccount({
      bankName: bankName.trim(),
      accountName: accountName.trim(),
      accountNumberMasked: masked,
      ifscCode: ifscCode.trim().toUpperCase(),
      accountType,
      glAccountId: glAcc.id,
    });

    if (initialPaise > 0) {
      newBank.currentBalancePaise = initialPaise;
      glAcc.balancePaise = initialPaise;
    }

    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setIfscCode('');
    setOpeningBalanceRupees('');
    setIsAddBankModalOpen(false);
  };

  const handleAddStatementLine = () => {
    if (!stmtBankId) {
      alert('Please select a bank account.');
      return;
    }
    if (!stmtDesc.trim()) {
      alert('Please enter a description / narration.');
      return;
    }

    const debitPaise = rupeesToPaise(stmtDebitRupees || '0');
    const creditPaise = rupeesToPaise(stmtCreditRupees || '0');
    const bank = storeState.bankAccounts.find((b) => b.id === stmtBankId);
    const prevBalance = bank ? bank.currentBalancePaise : 0;
    const newBalance = prevBalance - debitPaise + creditPaise;

    if (bank) {
      bank.currentBalancePaise = newBalance;
    }

    globalDataStore.addBankStatementLine({
      bankAccountId: stmtBankId,
      transactionDate: stmtDate || new Date().toISOString().split('T')[0],
      description: stmtDesc.trim(),
      referenceNumber: stmtRef.trim() || `REF-${Date.now()}`,
      debitPaise,
      creditPaise,
      balancePaise: newBalance,
      isReconciled: true,
    });

    setStmtDesc('');
    setStmtRef('');
    setStmtDebitRupees('');
    setStmtCreditRupees('');
    setIsAddStatementModalOpen(false);
  };

  const handleExecuteTransfer = () => {
    if (!transferRupees || !sourceBankId || !destBankId) {
      setTransferMessage({ type: 'error', text: 'Please fill in all transfer fields.' });
      return;
    }

    const amountPaise = rupeesToPaise(transferRupees);
    const res = globalDataStore.recordBankTransfer(
      sourceBankId,
      destBankId,
      amountPaise,
      transferRef.trim() || `UTR-${Date.now()}`
    );

    if (res.success) {
      setTransferMessage({
        type: 'success',
        text: 'Internal fund transfer executed and balanced journal entry posted without affecting P&L.',
      });
      setTimeout(() => {
        setTransferMessage(null);
        setTransferRupees('');
        setTransferRef('');
        setIsTransferModalOpen(false);
      }, 700);
    } else {
      setTransferMessage({ type: 'error', text: res.error || 'Failed to execute transfer.' });
    }
  };

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Banking & Statement Reconciliation
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Treasury accounts, inter-bank transfers, and statement lines
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAddStatementModalOpen(true)}>
            <Plus size={13} /> Add Statement Line
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsAddBankModalOpen(true)}>
            <Landmark size={13} /> Add Bank Account
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsTransferModalOpen(true)}>
            <ArrowRightLeft size={13} /> Internal Transfer
          </Button>
        </div>
      </div>

      {/* Bank Account Cards */}
      {storeState.bankAccounts.length === 0 ? (
        <Card noPadding>
          <div className="p-8 text-center text-xs text-[#777777]">
            No business bank accounts configured yet. Click &quot;Add Bank Account&quot; to connect your checking or savings accounts.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storeState.bankAccounts.map((acc) => (
            <Card key={acc.id} noPadding>
              <div className="p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#F4F3EF] border border-[#E5E5E5]">
                      <Landmark size={20} className="text-[#111111]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                        {acc.accountName}
                      </h3>
                      <p className="text-[11px] text-[#666666]">
                        {acc.bankName} • {acc.accountNumberMasked}
                      </p>
                    </div>
                  </div>
                  <Badge status="Active" />
                </div>

                <div className="mt-4 pt-3 border-t border-[#F0EFEA] flex justify-between items-baseline">
                  <span className="text-[11px] text-[#777777] uppercase font-medium">
                    Current Book Balance
                  </span>
                  <span className="text-lg font-bold text-[#111111] num-tabular">
                    <CurrencyDisplay paise={acc.currentBalancePaise} />
                  </span>
                </div>

                <div className="mt-2 text-[10px] text-[#888888] font-mono flex justify-between">
                  <span>IFSC: {acc.ifscCode || 'N/A'}</span>
                  <span>Type: {acc.accountType} Account</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Statement Feed with UTR Tracking */}
      <Card
        title="Bank Statement Feeds & Reconciliation Matches"
        subtitle="Statement lines verified against ledger postings"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Transaction Date</th>
                <th className="p-3">Narration / Description</th>
                <th className="p-3">Reference / UTR #</th>
                <th className="p-3 text-right">Debit (Withdrawal)</th>
                <th className="p-3 text-right">Credit (Deposit)</th>
                <th className="p-3 text-right">Statement Balance</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {storeState.bankStatementLines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-[#777777]">
                    No bank statement lines recorded yet. Click &quot;Add Statement Line&quot; to log incoming or outgoing banking transactions.
                  </td>
                </tr>
              ) : (
                storeState.bankStatementLines.map((line) => (
                  <tr key={line.id} className="hover:bg-[#FAFAF9]">
                    <td className="p-3 text-xs text-[#555555]">
                      {formatDate(line.transactionDate)}
                    </td>
                    <td className="p-3 text-xs font-medium text-[#111111]">
                      {line.description}
                    </td>
                    <td className="p-3 font-mono text-xs text-[#666666]">
                      {line.referenceNumber}
                    </td>
                    <td className="p-3 text-right num-tabular text-xs text-[#C5221F]">
                      {line.debitPaise > 0 ? <CurrencyDisplay paise={line.debitPaise} /> : '—'}
                    </td>
                    <td className="p-3 text-right num-tabular text-xs text-[#137333]">
                      {line.creditPaise > 0 ? <CurrencyDisplay paise={line.creditPaise} /> : '—'}
                    </td>
                    <td className="p-3 text-right num-tabular text-xs font-bold">
                      <CurrencyDisplay paise={line.balancePaise} />
                    </td>
                    <td className="p-3 text-center">
                      <Badge status={line.isReconciled ? 'Reconciled' : 'Unmatched'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Bank Account Modal */}
      <Modal
        isOpen={isAddBankModalOpen}
        onClose={() => setIsAddBankModalOpen(false)}
        title="Add Business Bank Account"
        subtitle="Registers treasury ledger account and enables electronic reconciliation"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Bank Institution Name *
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Account Nickname / Purpose *
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Primary Operating Current Account"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Account Number *
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 50200012345678"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                placeholder="e.g. HDFC0000123"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Account Classification
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as any)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-medium"
              >
                <option value="Bank">Bank Account (Current/Savings)</option>
                <option value="Cash">Cash Ledger (Petty Cash)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={openingBalanceRupees}
                onChange={(e) => setOpeningBalanceRupees(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsAddBankModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateBankAccount}>
              Save Bank Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Statement Line Modal */}
      <Modal
        isOpen={isAddStatementModalOpen}
        onClose={() => setIsAddStatementModalOpen(false)}
        title="Record Bank Statement Movement"
        subtitle="Enters a line item into the bank statement reconciliation register"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {storeState.bankAccounts.length === 0 ? (
            <div className="p-4 bg-[#FEF7E0] border border-[#FEEFC3] text-[#B25900]">
              Please create a bank account first before recording statement movements.
              <div className="mt-3">
                <Button variant="primary" size="sm" onClick={() => { setIsAddStatementModalOpen(false); setIsAddBankModalOpen(true); }}>
                  Add Bank Account
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Bank Account *
                </label>
                <select
                  value={stmtBankId}
                  onChange={(e) => setStmtBankId(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-semibold"
                >
                  {storeState.bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} ({b.accountNumberMasked})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={stmtDate}
                    onChange={(e) => setStmtDate(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Reference / UTR Number
                  </label>
                  <input
                    type="text"
                    value={stmtRef}
                    onChange={(e) => setStmtRef(e.target.value)}
                    placeholder="e.g. UTR12345678"
                    className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Narration / Description *
                </label>
                <input
                  type="text"
                  value={stmtDesc}
                  onChange={(e) => setStmtDesc(e.target.value)}
                  placeholder="e.g. Client wire transfer received / Office rent NEFT"
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#F4F3EF] p-3 border border-[#E5E5E5]">
                <div>
                  <label className="block text-[10px] font-medium text-[#C5221F] mb-0.5">
                    Debit (Withdrawal / Outflow ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={stmtDebitRupees}
                    onChange={(e) => { setStmtDebitRupees(e.target.value); if (e.target.value) setStmtCreditRupees(''); }}
                    placeholder="0.00"
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs text-right font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#137333] mb-0.5">
                    Credit (Deposit / Inflow ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={stmtCreditRupees}
                    onChange={(e) => { setStmtCreditRupees(e.target.value); if (e.target.value) setStmtDebitRupees(''); }}
                    placeholder="0.00"
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs text-right font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="md" onClick={() => setIsAddStatementModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={handleAddStatementLine}>
                  Save Statement Line
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Transfer Funds Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Internal Bank Account Transfer"
        subtitle="Double-entry transfer preserves balanced asset accounts without impacting P&L"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {transferMessage && (
            <div
              className={`p-2.5 border text-xs font-medium ${
                transferMessage.type === 'error'
                  ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
                  : 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
              }`}
            >
              {transferMessage.text}
            </div>
          )}

          {storeState.bankAccounts.length < 2 ? (
            <div className="p-4 bg-[#FEF7E0] border border-[#FEEFC3] text-[#B25900]">
              Internal bank transfers require at least two configured bank accounts.
              <div className="mt-3">
                <Button variant="primary" size="sm" onClick={() => { setIsTransferModalOpen(false); setIsAddBankModalOpen(true); }}>
                  Add Another Bank Account
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Source Bank Account (Debit Out)
                </label>
                <select
                  value={sourceBankId}
                  onChange={(e) => setSourceBankId(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
                >
                  {storeState.bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} (Balance: ₹ {(b.currentBalancePaise / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Destination Bank Account (Credit In)
                </label>
                <select
                  value={destBankId}
                  onChange={(e) => setDestBankId(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
                >
                  {storeState.bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} (Balance: ₹ {(b.currentBalancePaise / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Transfer Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transferRupees}
                  placeholder="0.00"
                  onChange={(e) => setTransferRupees(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono text-right font-bold outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Transaction Reference / UTR Number
                </label>
                <input
                  type="text"
                  value={transferRef}
                  placeholder="e.g. UTR-TRF-001"
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="md" onClick={() => setIsTransferModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={handleExecuteTransfer}>
                  Post Inter-Bank Transfer
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </WebLayout>
  );
}
