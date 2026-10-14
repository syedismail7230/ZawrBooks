'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { formatDate } from '@/lib/utils';
import { rupeesToPaise } from '@/lib/accounting/engine';
import { Plus, Search, FileText, Mail, CheckCircle2 } from 'lucide-react';
import { VendorBill } from '@/types';

export default function VendorsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [emailingBillId, setEmailingBillId] = useState<string | null>(null);
  const [emailAlert, setEmailAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Vendor Form State
  const [vendorName, setVendorName] = useState('');
  const [vendorLegalName, setVendorLegalName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorPan, setVendorPan] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');

  // Bill Form State
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [taxableRupees, setTaxableRupees] = useState('');
  const [taxRupees, setTaxRupees] = useState('');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const handleCreateVendor = () => {
    if (!vendorName.trim()) {
      alert('Please enter vendor name.');
      return;
    }

    globalDataStore.addVendor({
      name: vendorName.trim(),
      legalName: vendorLegalName.trim() || vendorName.trim(),
      gstin: vendorGstin.trim().toUpperCase(),
      pan: vendorPan.trim().toUpperCase() || (vendorGstin.length >= 12 ? vendorGstin.substring(2, 12).toUpperCase() : ''),
      email: vendorEmail.trim(),
      phone: vendorPhone.trim(),
      billingAddress: vendorAddress.trim(),
    });

    setVendorName('');
    setVendorLegalName('');
    setVendorGstin('');
    setVendorPan('');
    setVendorEmail('');
    setVendorPhone('');
    setVendorAddress('');
    setIsAddVendorOpen(false);
  };

  const handleCreateBill = () => {
    const vend = storeState.vendors.find((v) => v.id === selectedVendorId);
    if (!vend) {
      alert('Please select a valid supplier/vendor.');
      return;
    }
    if (!billNumber.trim() || !taxableRupees) {
      alert('Please enter bill number and taxable amount.');
      return;
    }

    const subtotalPaise = rupeesToPaise(taxableRupees);
    const taxPaise = rupeesToPaise(taxRupees || '0');
    const totalPaise = subtotalPaise + taxPaise;

    globalDataStore.addVendorBill({
      vendorId: vend.id,
      vendorName: vend.name,
      billNumber: billNumber.trim(),
      billDate: billDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || billDate || new Date().toISOString().split('T')[0],
      subtotalPaise,
      taxPaise,
      totalPaise,
    });

    setBillNumber('');
    setTaxableRupees('');
    setTaxRupees('');
    setIsAddBillOpen(false);
  };

  const handleEmailRemittance = async (bill: VendorBill) => {
    setEmailingBillId(bill.id);
    setEmailAlert(null);
    try {
      const vend = storeState.vendors.find((v) => v.id === bill.vendorId);
      const res = await fetch('/api/email/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VENDOR_REMITTANCE',
          payload: {
            bill,
            vendor: vend,
            paidAmountPaise: bill.totalPaise,
            tdsDeductedPaise: Math.round(bill.subtotalPaise * 0.02),
            utrReference: `HDFCR52026${bill.billNumber.replace(/[^0-9]/g, '') || '9821'}`,
            paymentDate: new Date().toISOString(),
          },
        }),
      });
      const data = await res.json();
      setEmailingBillId(null);
      if (data.success) {
        setEmailAlert({
          type: 'success',
          text: `Payment Remittance Advice for bill ${bill.billNumber} dispatched to ${vend?.email || 'admin@zawrindustries.com'} & admin@zawrindustries.com.`,
        });
      } else {
        setEmailAlert({ type: 'error', text: data.error || 'Failed to dispatch remittance advice' });
      }
    } catch (err: any) {
      setEmailingBillId(null);
      setEmailAlert({ type: 'error', text: err.message });
    }
  };

  const filteredVendors = storeState.vendors.filter((v) => {
    const q = searchQuery.toLowerCase();
    return v.name.toLowerCase().includes(q) || v.gstin.toLowerCase().includes(q);
  });

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Vendors & Purchase Bills
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Accounts payable management, supplier GSTINs, and purchase bill entries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAddVendorOpen(true)}>
            <Plus size={13} /> Add Supplier Master
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddBillOpen(true)}>
            <Plus size={13} /> Add Vendor Bill
          </Button>
        </div>
      </div>

      {emailAlert && (
        <div
          className={`p-3 border text-xs font-medium flex items-center justify-between ${
            emailAlert.type === 'error'
              ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
              : 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{emailAlert.text}</span>
          </div>
          <button onClick={() => setEmailAlert(null)} className="font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Vendor Master Records */}
      <Card title="Supplier & Vendor Master Directory" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Vendor Legal Entity</th>
                <th className="p-3">GSTIN / PAN</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-right">Outstanding Payable</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-xs text-[#777777]">
                    No vendors registered yet. Click &quot;Add Supplier Master&quot; to create your first supplier profile.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vend) => (
                  <tr key={vend.id} className="hover:bg-[#FAFAF9]">
                    <td className="p-3 text-xs">
                      <div className="font-bold text-[#111111]">{vend.name}</div>
                      <div className="text-[10px] text-[#777777]">{vend.legalName}</div>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <div>{vend.gstin || 'Unregistered'}</div>
                      {vend.pan && <div className="text-[10px] text-[#888888]">PAN: {vend.pan}</div>}
                    </td>
                    <td className="p-3 text-xs text-[#555555]">
                      <div>{vend.email || '—'}</div>
                      <div className="text-[10px]">{vend.phone || '—'}</div>
                    </td>
                    <td className="p-3 text-right num-tabular text-xs font-bold text-[#C5221F]">
                      <CurrencyDisplay paise={vend.outstandingBalancePaise} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Purchase Bills Register */}
      <Card title="Purchase Bills Register" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left financial-table">
            <thead>
              <tr>
                <th className="p-3">Bill #</th>
                <th className="p-3">Supplier Name</th>
                <th className="p-3">Bill Date</th>
                <th className="p-3">Due Date</th>
                <th className="p-3 text-right">Taxable</th>
                <th className="p-3 text-right">Tax</th>
                <th className="p-3 text-right">Total Payable</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {storeState.vendorBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-xs text-[#777777]">
                    No purchase bills recorded yet. Click &quot;Add Vendor Bill&quot; to record incoming supplier invoices.
                  </td>
                </tr>
              ) : (
                storeState.vendorBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-[#FAFAF9]">
                    <td className="p-3 font-mono text-xs font-bold text-[#111111]">
                      {bill.billNumber}
                    </td>
                    <td className="p-3 text-xs font-medium text-[#222222]">
                      {bill.vendorName}
                    </td>
                    <td className="p-3 text-xs text-[#555555]">{formatDate(bill.billDate)}</td>
                    <td className="p-3 text-xs text-[#555555]">{formatDate(bill.dueDate)}</td>
                    <td className="p-3 text-right num-tabular text-xs">
                      <CurrencyDisplay paise={bill.subtotalPaise} />
                    </td>
                    <td className="p-3 text-right num-tabular text-xs">
                      <CurrencyDisplay paise={bill.taxPaise} />
                    </td>
                    <td className="p-3 text-right num-tabular text-xs font-bold">
                      <CurrencyDisplay paise={bill.totalPaise} />
                    </td>
                    <td className="p-3 text-center">
                      <Badge status={bill.status} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        title="Email Payment Advice / Remittance Voucher to Vendor"
                        disabled={emailingBillId === bill.id}
                        onClick={() => handleEmailRemittance(bill)}
                        className="px-2 py-1 bg-white border border-[#CCCCCC] hover:border-black text-[11px] font-medium flex items-center gap-1 text-[#111111] transition-colors disabled:opacity-50 ml-auto"
                      >
                        <Mail size={12} />
                        {emailingBillId === bill.id ? 'Sending...' : 'Payment Advice'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Vendor Modal */}
      <Modal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        title="Add Vendor / Supplier"
        subtitle="Registers supplier for purchase bills and accounts payable ledger"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Vendor Name *
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Supplier Trading Name"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Legal Entity Name
              </label>
              <input
                type="text"
                value={vendorLegalName}
                onChange={(e) => setVendorLegalName(e.target.value)}
                placeholder="e.g. Supplier Legal Registered Name"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Supplier GSTIN
              </label>
              <input
                type="text"
                value={vendorGstin}
                onChange={(e) => setVendorGstin(e.target.value)}
                placeholder="e.g. 27AAAAA0000A1Z5"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Supplier PAN
              </label>
              <input
                type="text"
                value={vendorPan}
                onChange={(e) => setVendorPan(e.target.value)}
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
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
                placeholder="invoices@supplier.com"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={vendorPhone}
                onChange={(e) => setVendorPhone(e.target.value)}
                placeholder="+91 98000 00000"
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#666666] mb-1">
              Registered Address
            </label>
            <input
              type="text"
              value={vendorAddress}
              onChange={(e) => setVendorAddress(e.target.value)}
              placeholder="e.g. Plot 12, Industrial Area, Sector 5, Gurugram, HR"
              className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsAddVendorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateVendor}>
              Save Supplier
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Bill Modal */}
      <Modal
        isOpen={isAddBillOpen}
        onClose={() => setIsAddBillOpen(false)}
        title="Record Vendor Purchase Bill"
        subtitle="Posts double-entry accounts payable liability and expense debit"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {storeState.vendors.length === 0 ? (
            <div className="p-4 bg-[#FEF7E0] border border-[#FEEFC3] text-[#B25900]">
              Please add at least one supplier master record first before recording purchase bills.
              <div className="mt-3">
                <Button variant="primary" size="sm" onClick={() => { setIsAddBillOpen(false); setIsAddVendorOpen(true); }}>
                  Add Supplier Master
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Select Supplier / Vendor *
                </label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-semibold"
                >
                  <option value="">-- Choose Supplier --</option>
                  {storeState.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (GSTIN: {v.gstin || 'None'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Bill / Invoice # *
                  </label>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="e.g. BILL-9921"
                    className="w-full bg-white border border-[#CCCCCC] p-2 text-xs font-mono outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Bill Date
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#666666] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#F4F3EF] p-3 border border-[#E5E5E5]">
                <div>
                  <label className="block text-[10px] font-medium text-[#666666] mb-0.5">
                    Taxable Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxableRupees}
                    onChange={(e) => setTaxableRupees(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs text-right font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#666666] mb-0.5">
                    GST Tax Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxRupees}
                    onChange={(e) => setTaxRupees(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs text-right font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="md" onClick={() => setIsAddBillOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={handleCreateBill}>
                  Save & Post Bill
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </WebLayout>
  );
}
