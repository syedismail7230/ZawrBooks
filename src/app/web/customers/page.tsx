'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { Customer } from '@/types';
import { Users, Plus, FileText, Search, Mail, Send, CheckCircle2 } from 'lucide-react';

import { Modal } from '@/components/common/Modal';
import { rupeesToPaise } from '@/lib/accounting/engine';

export default function CustomersPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [emailingCustomerId, setEmailingCustomerId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Customer Form
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [creditLimitRupees, setCreditLimitRupees] = useState('');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleCreateCustomer = () => {
    if (!name.trim()) {
      alert('Please enter a customer trading or commercial name.');
      return;
    }

    globalDataStore.addCustomer({
      name: name.trim(),
      legalName: legalName.trim() || name.trim(),
      gstin: gstin.trim().toUpperCase(),
      pan: pan.trim().toUpperCase() || (gstin.length >= 12 ? gstin.substring(2, 12).toUpperCase() : ''),
      email: email.trim(),
      phone: phone.trim(),
      billingAddress: billingAddress.trim(),
      creditLimitPaise: rupeesToPaise(creditLimitRupees || '0'),
    });

    setName('');
    setLegalName('');
    setGstin('');
    setPan('');
    setEmail('');
    setPhone('');
    setBillingAddress('');
    setCreditLimitRupees('');
    setIsCreateOpen(false);
  };

  const handleEmailCustomerStatement = async (cust: Customer) => {
    setEmailingCustomerId(cust.id);
    setEmailStatus(null);
    try {
      const custInvoices = storeState.invoices.filter((i) => i.customerId === cust.id);
      const res = await fetch('/api/email/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CUSTOMER_STATEMENT',
          payload: {
            customer: cust,
            invoices: custInvoices,
          },
        }),
      });
      const data = await res.json();
      setEmailingCustomerId(null);
      if (data.success) {
        setEmailStatus({
          type: 'success',
          text: `Statement of Account with attached Excel spreadsheet dispatched to ${cust.email || 'admin@zawrindustries.com'} & admin@zawrindustries.com.`,
        });
      } else {
        setEmailStatus({ type: 'error', text: data.error || 'Failed to dispatch statement' });
      }
    } catch (err: any) {
      setEmailingCustomerId(null);
      setEmailStatus({ type: 'error', text: err.message });
    }
  };

  const filtered = storeState.customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.gstin.toLowerCase().includes(q);
  });

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Customer Master & Subledger
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Trade debtors master records, GSTIN verification, credit limits, and balances
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus size={13} /> Add Customer
        </Button>
      </div>

      {emailStatus && (
        <div
          className={`p-3 border text-xs font-medium flex items-center justify-between ${
            emailStatus.type === 'error'
              ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
              : 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{emailStatus.text}</span>
          </div>
          <button onClick={() => setEmailStatus(null)} className="font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      <Card noPadding>
        <div className="p-3 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#888888]" />
            <input
              type="text"
              placeholder="Search customer by name or GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F3EF] border border-[#CCCCCC] pl-8 pr-3 py-1.5 text-xs outline-none focus:border-black"
            />
          </div>
          <span className="text-[11px] text-[#777777]">
            {filtered.length} customers registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Customer Legal Name</th>
                <th className="p-3">GSTIN / PAN</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-right">Credit Limit</th>
                <th className="p-3 text-right">Outstanding Balance</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-[#777777]">
                    No customers registered yet. Click &quot;Add Customer&quot; to create your first client account.
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-[#FAFAF9]">
                    <td className="p-3 text-xs">
                      <div className="font-bold text-[#111111]">{cust.name}</div>
                      <div className="text-[10px] text-[#777777]">{cust.legalName}</div>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <div>{cust.gstin}</div>
                      <div className="text-[10px] text-[#888888]">PAN: {cust.pan}</div>
                    </td>
                    <td className="p-3 text-xs text-[#555555]">
                      <div>{cust.email}</div>
                      <div className="text-[10px]">{cust.phone}</div>
                    </td>
                    <td className="p-3 text-right num-tabular text-xs">
                      <CurrencyDisplay paise={cust.creditLimitPaise} />
                    </td>
                    <td className="p-3 text-right num-tabular text-xs font-bold text-[#C5221F]">
                      <CurrencyDisplay paise={cust.outstandingBalancePaise} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Email Subledger Statement & Excel to Customer"
                          disabled={emailingCustomerId === cust.id}
                          onClick={() => handleEmailCustomerStatement(cust)}
                          className="px-2 py-1 bg-white border border-[#CCCCCC] hover:border-black text-[11px] font-medium flex items-center gap-1 text-[#111111] transition-colors disabled:opacity-50"
                        >
                          <Mail size={12} />
                          {emailingCustomerId === cust.id ? 'Sending...' : 'Email'}
                        </button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCustomer(cust)}
                        >
                          <FileText size={12} /> View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Customer Statement Preview */}
      {selectedCustomer && (
        <Card title={`Customer Statement: ${selectedCustomer.name}`}>
          <div className="text-xs space-y-3">
            <div className="flex justify-between border-b pb-2">
              <div>
                <div className="font-bold">{selectedCustomer.legalName}</div>
                <div className="text-gray-500">{selectedCustomer.billingAddress}</div>
                <div className="font-mono text-[11px]">GSTIN: {selectedCustomer.gstin}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-gray-500">Current Outstanding Receivable</div>
                <CurrencyDisplay paise={selectedCustomer.outstandingBalancePaise} className="text-base font-bold text-[#C5221F]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={emailingCustomerId === selectedCustomer.id}
                onClick={() => handleEmailCustomerStatement(selectedCustomer)}
              >
                <Mail size={12} /> {emailingCustomerId === selectedCustomer.id ? 'Dispatching...' : 'Email Statement to Customer'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Customer Master"
        subtitle="Registers client for sales invoicing and accounts receivable tracking"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Customer Trading Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Customer Trading Name"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Registered Legal Name
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Customer Legal Registered Name"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                GSTIN
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 29AAAAA0000A1Z5"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                PAN
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                placeholder="e.g. AAAAA0000A"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accounts@client.com"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98000 00000"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Billing Address
              </label>
              <input
                type="text"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="e.g. Suite 400, Indiranagar, Bengaluru, KA"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                value={creditLimitRupees}
                onChange={(e) => setCreditLimitRupees(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateCustomer}>
              Save Customer
            </Button>
          </div>
        </div>
      </Modal>
    </WebLayout>
  );
}
