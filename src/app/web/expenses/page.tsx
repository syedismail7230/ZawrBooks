'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { globalDataStore } from '@/lib/store/dataStore';
import { ExpenseSubmission, VendorBill } from '@/types';
import { formatDate } from '@/lib/utils';
import { Scan, Search, Eye, FileText, Briefcase, Plus, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ExpensesPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'EXPENSES' | 'BILLS'>('ALL');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseSubmission | null>(null);
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(null);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const q = searchQuery.toLowerCase();

  const filteredExpenses = storeState.expenses.filter((exp) => {
    return (
      exp.title.toLowerCase().includes(q) ||
      exp.vendorName.toLowerCase().includes(q) ||
      exp.employeeName.toLowerCase().includes(q) ||
      exp.invoiceNumber.toLowerCase().includes(q)
    );
  });

  const filteredBills = storeState.vendorBills.filter((bill) => {
    return (
      bill.vendorName.toLowerCase().includes(q) ||
      bill.billNumber.toLowerCase().includes(q)
    );
  });

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Expenses & Vendor Bills
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            AI-extracted expense register, vendor bills, employee submissions, and approval status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/web/vendors">
            <Button variant="outline" size="sm">
              <Briefcase size={13} /> Manage Vendors
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={() => setIsScannerOpen(true)}>
            <Scan size={13} /> AI Scan Receipt / Bill
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#CCCCCC]">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ALL'
              ? 'border-black text-[#111111]'
              : 'border-transparent text-[#666666] hover:text-black'
          }`}
        >
          All Items ({filteredExpenses.length + filteredBills.length})
        </button>
        <button
          onClick={() => setActiveTab('EXPENSES')}
          className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'EXPENSES'
              ? 'border-black text-[#111111]'
              : 'border-transparent text-[#666666] hover:text-black'
          }`}
        >
          <FileText size={13} />
          <span>Employee Expenses ({filteredExpenses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('BILLS')}
          className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'BILLS'
              ? 'border-black text-[#111111]'
              : 'border-transparent text-[#666666] hover:text-black'
          }`}
        >
          <Briefcase size={13} />
          <span>Vendor Bills ({filteredBills.length})</span>
        </button>
      </div>

      <Card noPadding>
        <div className="p-3 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#888888]" />
            <input
              type="text"
              placeholder="Search by vendor, employee, or invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F3EF] border border-[#CCCCCC] pl-8 pr-3 py-1.5 text-xs outline-none focus:border-black"
            />
          </div>
          <span className="text-[11px] text-[#777777]">
            Showing {(activeTab === 'EXPENSES' ? filteredExpenses.length : activeTab === 'BILLS' ? filteredBills.length : filteredExpenses.length + filteredBills.length)} records
          </span>
        </div>

        {/* Expenses Table */}
        {(activeTab === 'ALL' || activeTab === 'EXPENSES') && (
          <div>
            <div className="p-2.5 bg-[#FAFAF9] border-b border-[#E5E5E5] text-[11px] font-bold text-[#555555] uppercase tracking-wider flex items-center justify-between">
              <span>Employee Expense Claims</span>
              <span className="text-[#888888] font-normal">{filteredExpenses.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left financial-table">
                <thead>
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Title / Vendor</th>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">Tax (GST)</th>
                    <th className="p-3 text-right">Total Amount</th>
                    <th className="p-3 text-center">Reimbursable</th>
                    <th className="p-3 text-center">Approval Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[#777777]">
                        <div className="max-w-sm mx-auto space-y-1">
                          <p className="font-semibold text-xs text-[#111111]">No Employee Expenses Logged</p>
                          <p className="text-[11px] text-[#888888]">
                            Click &ldquo;AI Scan Receipt / Bill&rdquo; to capture receipts or upload bills into the live ledger.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-[#FAFAF9] cursor-pointer" onClick={() => setSelectedExpense(exp)}>
                        <td className="p-3 text-xs text-[#555555]">{formatDate(exp.invoiceDate)}</td>
                        <td className="p-3 text-xs font-medium text-[#111111]">
                          <div>{exp.vendorName}</div>
                          <div className="text-[10px] text-[#777777] font-mono">{exp.invoiceNumber}</div>
                        </td>
                        <td className="p-3 text-xs text-[#444444]">{exp.employeeName}</td>
                        <td className="p-3 text-xs text-[#666666]">{exp.category}</td>
                        <td className="p-3 text-right num-tabular text-xs">
                          <CurrencyDisplay paise={exp.subtotalPaise} />
                        </td>
                        <td className="p-3 text-right num-tabular text-xs text-[#666666]">
                          <CurrencyDisplay paise={exp.totalTaxPaise} />
                        </td>
                        <td className="p-3 text-right num-tabular text-xs font-bold text-[#111111]">
                          <CurrencyDisplay paise={exp.grandTotalPaise} />
                        </td>
                        <td className="p-3 text-center text-xs">
                          {exp.isReimbursable ? (
                            <span className="text-[#137333] font-medium text-[11px]">Yes</span>
                          ) : (
                            <span className="text-[#888888] text-[11px]">Company Paid</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge status={exp.status} />
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExpense(exp);
                            }}
                          >
                            <Eye size={12} /> View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vendor Bills Table */}
        {(activeTab === 'ALL' || activeTab === 'BILLS') && (
          <div className="border-t border-[#E5E5E5]">
            <div className="p-2.5 bg-[#FAFAF9] border-b border-[#E5E5E5] text-[11px] font-bold text-[#555555] uppercase tracking-wider flex items-center justify-between">
              <span>Vendor & Supplier Bills</span>
              <span className="text-[#888888] font-normal">{filteredBills.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left financial-table">
                <thead>
                  <tr>
                    <th className="p-3">Bill Date</th>
                    <th className="p-3">Vendor / Supplier</th>
                    <th className="p-3">Bill #</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">Tax (GST)</th>
                    <th className="p-3 text-right">Total Payable</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[#777777]">
                        <div className="max-w-sm mx-auto space-y-1">
                          <p className="font-semibold text-xs text-[#111111]">No Vendor Bills Recorded</p>
                          <p className="text-[11px] text-[#888888]">
                            Upload vendor bills via AI Scan or add directly from the Vendors page.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-[#FAFAF9] cursor-pointer" onClick={() => setSelectedBill(bill)}>
                        <td className="p-3 text-xs text-[#555555]">{formatDate(bill.billDate)}</td>
                        <td className="p-3 text-xs font-semibold text-[#111111]">{bill.vendorName}</td>
                        <td className="p-3 text-xs font-mono font-medium text-[#333333]">{bill.billNumber}</td>
                        <td className="p-3 text-xs text-[#666666]">{formatDate(bill.dueDate)}</td>
                        <td className="p-3 text-right num-tabular text-xs">
                          <CurrencyDisplay paise={bill.subtotalPaise} />
                        </td>
                        <td className="p-3 text-right num-tabular text-xs text-[#666666]">
                          <CurrencyDisplay paise={bill.taxPaise} />
                        </td>
                        <td className="p-3 text-right num-tabular text-xs font-bold text-[#111111]">
                          <CurrencyDisplay paise={bill.totalPaise} />
                        </td>
                        <td className="p-3 text-right num-tabular text-xs text-[#137333]">
                          <CurrencyDisplay paise={bill.amountPaidPaise || 0} />
                        </td>
                        <td className="p-3 text-center">
                          <Badge status={bill.status} />
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBill(bill);
                            }}
                          >
                            <Eye size={12} /> View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedExpense(null)}
          title="Expense Claim Particulars"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#F4F3EF] border border-[#E5E5E5] flex justify-between items-center">
              <div>
                <div className="font-bold text-sm text-[#111111]">{selectedExpense.title}</div>
                <div className="text-[11px] text-[#666666]">{selectedExpense.vendorName} | Invoice #{selectedExpense.invoiceNumber}</div>
                {selectedExpense.vendorGstin && (
                  <div className="text-[10px] text-[#888888] font-mono">GSTIN: {selectedExpense.vendorGstin}</div>
                )}
              </div>
              <Badge status={selectedExpense.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-[#E5E5E5]">
              <div>
                <div className="text-[10px] text-[#888888] uppercase">Submitter</div>
                <div className="font-semibold text-[#111111]">{selectedExpense.employeeName}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#888888] uppercase">Expense Date</div>
                <div className="font-semibold text-[#111111]">{formatDate(selectedExpense.invoiceDate)}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#888888] uppercase">Category</div>
                <div className="font-semibold text-[#111111]">{selectedExpense.category}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#888888] uppercase">Cost Centre</div>
                <div className="font-semibold text-[#111111]">{selectedExpense.department}</div>
              </div>
            </div>

            <div className="p-3 border border-[#E5E5E5] bg-[#FAFAF9] space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span>Taxable Subtotal:</span>
                <CurrencyDisplay paise={selectedExpense.subtotalPaise} />
              </div>
              <div className="flex justify-between text-[#666666]">
                <span>CGST:</span>
                <CurrencyDisplay paise={selectedExpense.cgstPaise} />
              </div>
              <div className="flex justify-between text-[#666666]">
                <span>SGST:</span>
                <CurrencyDisplay paise={selectedExpense.sgstPaise} />
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-[#E5E5E5] text-[#111111]">
                <span>Grand Total:</span>
                <CurrencyDisplay paise={selectedExpense.grandTotalPaise} />
              </div>
            </div>

            <div>
              <div className="text-[10px] text-[#888888] uppercase mb-1">Commercial Purpose</div>
              <p className="p-2 bg-[#F4F3EF] border border-[#E5E5E5] text-xs text-[#444444]">
                {selectedExpense.businessPurpose || 'No detailed purpose supplied.'}
              </p>
            </div>

            {selectedExpense.status === 'Submitted' && (
              <div className="p-3 bg-[#FEF7E0] border border-[#FEEFC3] text-[#B25900] text-[11px] flex items-center justify-between">
                <span>Awaiting review in the Financial Approval Queue.</span>
                <Link href="/web/approvals" className="font-bold underline">
                  Go to Approvals Queue
                </Link>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Vendor Bill Detail Modal */}
      {selectedBill && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBill(null)}
          title="Vendor Bill Particulars"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#F4F3EF] border border-[#E5E5E5] flex justify-between items-center">
              <div>
                <div className="font-bold text-sm text-[#111111]">{selectedBill.vendorName}</div>
                <div className="text-[11px] text-[#666666] font-mono">Bill #{selectedBill.billNumber}</div>
              </div>
              <Badge status={selectedBill.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-[#E5E5E5]">
              <div>
                <div className="text-[10px] text-[#888888] uppercase">Bill Date</div>
                <div className="font-semibold text-[#111111]">{formatDate(selectedBill.billDate)}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#888888] uppercase">Due Date</div>
                <div className="font-semibold text-[#111111]">{formatDate(selectedBill.dueDate)}</div>
              </div>
            </div>

            <div className="p-3 border border-[#E5E5E5] bg-[#FAFAF9] space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <CurrencyDisplay paise={selectedBill.subtotalPaise} />
              </div>
              <div className="flex justify-between text-[#666666]">
                <span>Tax (GST):</span>
                <CurrencyDisplay paise={selectedBill.taxPaise} />
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-[#E5E5E5] text-[#111111]">
                <span>Total Amount:</span>
                <CurrencyDisplay paise={selectedBill.totalPaise} />
              </div>
              <div className="flex justify-between text-[#137333] pt-1">
                <span>Amount Paid:</span>
                <CurrencyDisplay paise={selectedBill.amountPaidPaise || 0} />
              </div>
              <div className="flex justify-between text-[#C5221F] font-bold">
                <span>Balance Due:</span>
                <CurrencyDisplay paise={selectedBill.totalPaise - (selectedBill.amountPaidPaise || 0)} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Global Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={() => {
          setStoreState({ ...globalDataStore.getState() });
        }}
      />
    </WebLayout>
  );
}
