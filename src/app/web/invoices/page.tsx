'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { Invoice } from '@/types';
import { formatDate } from '@/lib/utils';
import { rupeesToPaise } from '@/lib/accounting/engine';
import { Plus, CreditCard, Search, FileText, CheckCircle } from 'lucide-react';

export default function InvoicesPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  // New Invoice Form State
  const [customerId, setCustomerId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [hsnSac, setHsnSac] = useState('');
  const [taxableRupees, setTaxableRupees] = useState('');
  const [gstRate, setGstRate] = useState(18); // 18% (CGST 9% + SGST 9%)

  // Payment Recording State
  const [paymentAmountRupees, setPaymentAmountRupees] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [utrReference, setUtrReference] = useState('');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      const s = globalDataStore.getState();
      setStoreState({ ...s });
      if (!customerId && s.customers.length > 0) setCustomerId(s.customers[0].id);
      if (!bankAccountId && s.bankAccounts.length > 0) setBankAccountId(s.bankAccounts[0].id);
    });
  }, [customerId, bankAccountId]);

  useEffect(() => {
    if (isCreateOpen) {
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      if (!customerId && storeState.customers.length > 0) {
        setCustomerId(storeState.customers[0].id);
      }
    }
  }, [isCreateOpen, customerId, storeState.customers]);

  const handleCreateInvoice = () => {
    const cust = storeState.customers.find((c) => c.id === customerId);
    if (!cust) {
      alert('Please select a valid customer.');
      return;
    }
    if (!invoiceNumber.trim()) {
      alert('Please enter an invoice number (e.g. INV-2026-001).');
      return;
    }
    if (!itemDescription.trim()) {
      alert('Please enter a description for the item or service.');
      return;
    }
    if (!taxableRupees || Number(taxableRupees) <= 0) {
      alert('Please enter a valid taxable amount in Rupees.');
      return;
    }

    const subtotalPaise = rupeesToPaise(taxableRupees);
    const halfGstPaise = Math.round((subtotalPaise * (gstRate / 2)) / 100);
    const totalTaxPaise = halfGstPaise * 2;
    const totalPaise = subtotalPaise + totalTaxPaise;

    globalDataStore.createInvoice({
      customerId: cust.id,
      customerName: cust.name,
      customerGstin: cust.gstin,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || invoiceDate || new Date().toISOString().split('T')[0],
      items: [
        {
          id: `line-${Date.now()}`,
          description: itemDescription,
          hsnSac,
          quantity: 1,
          unitPricePaise: subtotalPaise,
          discountPaise: 0,
          taxRatePercent: gstRate,
          taxableAmountPaise: subtotalPaise,
          cgstPaise: halfGstPaise,
          sgstPaise: halfGstPaise,
          igstPaise: 0,
          totalPaise,
        },
      ],
      subtotalPaise,
      cgstPaise: halfGstPaise,
      sgstPaise: halfGstPaise,
      igstPaise: 0,
      totalTaxPaise,
      totalPaise,
      notes: 'Issued under GST Electronic Invoicing format.',
      terms: 'Payment terms: Bank transfer as specified on voucher.',
    });

    setInvoiceNumber('');
    setItemDescription('');
    setHsnSac('');
    setTaxableRupees('');
    setIsCreateOpen(false);
  };

  const handleRecordPayment = () => {
    if (!selectedInvoiceForPayment) return;
    const amountPaise = rupeesToPaise(paymentAmountRupees);

    const res = globalDataStore.recordInvoicePayment(
      selectedInvoiceForPayment.id,
      amountPaise,
      bankAccountId,
      utrReference
    );

    if (res.success) {
      setSelectedInvoiceForPayment(null);
    } else {
      alert(res.error || 'Failed to record payment');
    }
  };

  const filteredInvoices = storeState.invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q)
    );
  });

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Sales & Tax Invoices
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            GST compliant invoicing, accounts receivable tracking, and bank payment allocations
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus size={13} /> Create Tax Invoice
        </Button>
      </div>

      <Card noPadding>
        <div className="p-3 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#888888]" />
            <input
              type="text"
              placeholder="Search by invoice # or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F3EF] border border-[#CCCCCC] pl-8 pr-3 py-1.5 text-xs outline-none focus:border-black"
            />
          </div>
          <span className="text-[11px] text-[#777777]">
            {filteredInvoices.length} invoices recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Due Date</th>
                <th className="p-3 text-right">Taxable Value</th>
                <th className="p-3 text-right">GST Total</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-right">Amount Paid</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#777777]">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-sm text-[#111111]">No Invoices Recorded</p>
                      <p className="text-xs text-[#888888]">
                        There are currently no customer tax invoices. Click &ldquo;Issue Tax Invoice&rdquo; above to generate your first real electronic invoice.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#FAFAF9]">
                  <td className="p-3 font-mono text-xs font-bold text-[#111111]">
                    {inv.invoiceNumber}
                  </td>
                  <td className="p-3 text-xs">
                    <div className="font-semibold text-[#111111]">{inv.customerName}</div>
                    <div className="text-[10px] text-[#777777] font-mono">
                      GSTIN: {inv.customerGstin}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-[#555555]">{formatDate(inv.invoiceDate)}</td>
                  <td className="p-3 text-xs text-[#555555]">{formatDate(inv.dueDate)}</td>
                  <td className="p-3 text-right num-tabular text-xs">
                    <CurrencyDisplay paise={inv.subtotalPaise} />
                  </td>
                  <td className="p-3 text-right num-tabular text-xs">
                    <CurrencyDisplay paise={inv.totalTaxPaise} />
                  </td>
                  <td className="p-3 text-right num-tabular text-xs font-bold">
                    <CurrencyDisplay paise={inv.totalPaise} />
                  </td>
                  <td className="p-3 text-right num-tabular text-xs text-[#137333] font-medium">
                    <CurrencyDisplay paise={inv.amountPaidPaise} />
                  </td>
                  <td className="p-3 text-center">
                    <Badge status={inv.status} />
                  </td>
                  <td className="p-3 text-right">
                    {inv.status !== 'Paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoiceForPayment(inv);
                          setPaymentAmountRupees(((inv.totalPaise - inv.amountPaidPaise) / 100).toFixed(2));
                        }}
                      >
                        <CreditCard size={12} /> Record Receipt
                      </Button>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Tax Invoice Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Issue GST Tax Invoice"
        subtitle="Generates balanced revenue & accounts receivable double-entry records"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {storeState.customers.length === 0 ? (
            <div className="p-4 bg-[#F4F3EF] border border-[#CCCCCC] text-center space-y-2">
              <p className="font-semibold text-[#111111]">No Customers Found</p>
              <p className="text-xs text-[#666666]">
                You must have at least one registered customer in the system before generating a tax invoice.
              </p>
              <a
                href="/web/customers"
                className="inline-block px-3 py-1.5 bg-black text-white text-xs font-medium uppercase tracking-wider hover:bg-[#333333]"
              >
                Go to Customers
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Select Customer
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
                  >
                    {storeState.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (GSTIN: {c.gstin})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs font-mono outline-none focus:border-black"
                  />
                </div>
              </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="bg-[#F4F3EF] p-3 border border-[#E5E5E5] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#555555] block">
              Line Item & Tax Breakdown
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] text-[#666666] mb-0.5">Description</label>
                <input
                  type="text"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-1 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#666666] mb-0.5">HSN/SAC Code</label>
                <input
                  type="text"
                  value={hsnSac}
                  onChange={(e) => setHsnSac(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-1 text-xs font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-[#666666] mb-0.5">Taxable Value (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={taxableRupees}
                  onChange={(e) => setTaxableRupees(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-1 text-xs text-right font-mono outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#666666] mb-0.5">GST Rate</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full bg-white border border-[#CCCCCC] p-1 text-xs outline-none"
                >
                  <option value={18}>18% (CGST 9% + SGST 9%)</option>
                  <option value={12}>12% (CGST 6% + SGST 6%)</option>
                  <option value={5}>5% (CGST 2.5% + SGST 2.5%)</option>
                  <option value={0}>0% (Exempt)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateInvoice}>
              Issue & Post Invoice
            </Button>
          </div>
            </>
          )}
        </div>
      </Modal>

      {/* Record Payment Receipt Modal */}
      {selectedInvoiceForPayment && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoiceForPayment(null)}
          title={`Record Receipt for ${selectedInvoiceForPayment.invoiceNumber}`}
          subtitle="Allocates customer funds, reduces trade debtors, and posts to bank ledger"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Deposit Into Bank Account
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              >
                {storeState.bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - {b.accountName} ({b.accountNumberMasked})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={paymentAmountRupees}
                onChange={(e) => setPaymentAmountRupees(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono text-right font-bold outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Bank Transaction Reference / UTR Number
              </label>
              <input
                type="text"
                value={utrReference}
                onChange={(e) => setUtrReference(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="md" onClick={() => setSelectedInvoiceForPayment(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={handleRecordPayment}>
                Confirm & Post Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </WebLayout>
  );
}
