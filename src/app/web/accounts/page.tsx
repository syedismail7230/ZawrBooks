'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { AccountType } from '@/types';
import { Search, Plus, Filter } from 'lucide-react';

import { Modal } from '@/components/common/Modal';

export default function AccountsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Account State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Asset');
  const [subType, setSubType] = useState('');
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleCreateAccount = () => {
    if (!code.trim() || !name.trim()) {
      alert('Please enter an account code and account name.');
      return;
    }

    if (storeState.accounts.some((a) => a.code === code.trim())) {
      alert(`Account with code ${code.trim()} already exists.`);
      return;
    }

    globalDataStore.addAccount({
      code: code.trim(),
      name: name.trim(),
      type,
      subType: subType.trim() || type,
      currency,
      isActive: true,
    });

    setCode('');
    setName('');
    setSubType('');
    setIsAddOpen(false);
  };

  const handleInitStandardAccounts = () => {
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

  const tabs: Array<{ id: string; label: string }> = [
    { id: 'ALL', label: 'All Accounts' },
    { id: 'Asset', label: 'Assets (1xxx)' },
    { id: 'Liability', label: 'Liabilities (2xxx)' },
    { id: 'Equity', label: 'Equity (3xxx)' },
    { id: 'Revenue', label: 'Revenue (4xxx)' },
    { id: 'Expense', label: 'Expenses (5xxx)' },
  ];

  const filteredAccounts = storeState.accounts.filter((acc) => {
    const matchesTab = activeTab === 'ALL' || acc.type === activeTab;
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.code.includes(searchQuery) ||
      acc.subType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Chart of Accounts
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            General ledger account hierarchy across Assets, Liabilities, Equity, Revenue, and Expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          {storeState.accounts.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleInitStandardAccounts}>
              Initialize Standard COA
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus size={13} /> Add Account
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E5E5] gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#111111] text-[#111111] font-bold'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card noPadding>
        <div className="p-3 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#888888]" />
            <input
              type="text"
              placeholder="Search by code, account name, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F3EF] border border-[#CCCCCC] pl-8 pr-3 py-1.5 text-xs outline-none focus:border-black"
            />
          </div>
          <span className="text-[11px] text-[#777777]">
            {filteredAccounts.length} accounts found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Account Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Sub-Type Classification</th>
                <th className="p-3 text-right">Current Ledger Balance</th>
                <th className="p-3 text-center">Currency</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-[#777777]">
                    No accounts found. Click &quot;Add Account&quot; to create your ledger accounts or initialize the standard Chart of Accounts.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[#FAFAF9]">
                    <td className="p-3 font-mono text-xs font-bold text-[#111111]">
                      {acc.code}
                    </td>
                    <td className="p-3 text-xs font-medium text-[#111111]">
                      {acc.name}
                    </td>
                    <td className="p-3 text-xs">
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[10px] font-medium border rounded-none ${
                          acc.type === 'Asset'
                            ? 'bg-[#E8F0FE] text-[#1967D2] border-[#D2E3FC]'
                            : acc.type === 'Liability'
                            ? 'bg-[#FEF7E0] text-[#B25900] border-[#FEEFC3]'
                            : acc.type === 'Equity'
                            ? 'bg-[#F3E8FD] text-[#8430CE] border-[#E9D2FD]'
                            : acc.type === 'Revenue'
                            ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                            : 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
                        }`}
                      >
                        {acc.type}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-[#666666]">{acc.subType}</td>
                    <td className="p-3 text-right num-tabular text-xs font-bold">
                      <CurrencyDisplay paise={acc.balancePaise} />
                    </td>
                    <td className="p-3 text-center text-xs font-mono text-[#888888]">
                      {acc.currency}
                    </td>
                    <td className="p-3 text-center">
                      <Badge status={acc.isActive ? 'Active' : 'Inactive'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add General Ledger Account"
        subtitle="Defines a new account code within the Chart of Accounts hierarchy"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Account Code *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 1050"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Account Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-medium"
              >
                <option value="Asset">Asset (1xxx)</option>
                <option value="Liability">Liability (2xxx)</option>
                <option value="Equity">Equity (3xxx)</option>
                <option value="Revenue">Revenue (4xxx)</option>
                <option value="Expense">Expense (5xxx)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Account Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Office Equipment & Hardware"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Sub-Type / Classification
              </label>
              <input
                type="text"
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                placeholder="e.g. Fixed Assets / Current Assets"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Currency
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateAccount}>
              Save Account
            </Button>
          </div>
        </div>
      </Modal>
    </WebLayout>
  );
}
