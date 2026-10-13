'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { globalDataStore } from '@/lib/store/dataStore';
import { ExpenseSubmission } from '@/types';
import { formatDate } from '@/lib/utils';
import { Scan, Search, Eye, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function ExpensesPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseSubmission | null>(null);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const filteredExpenses = storeState.expenses.filter((exp) => {
    const q = searchQuery.toLowerCase();
    return (
      exp.title.toLowerCase().includes(q) ||
      exp.vendorName.toLowerCase().includes(q) ||
      exp.employeeName.toLowerCase().includes(q) ||
      exp.invoiceNumber.toLowerCase().includes(q)
    );
  });

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Expenses & Vendor Receipts
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            AI-extracted expense register, employee submissions, and approval status
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsScannerOpen(true)}>
          <Scan size={13} /> AI Scan Receipt
        </Button>
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
            {filteredExpenses.length} expenses logged
          </span>
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
                      <p className="font-semibold text-sm text-[#111111]">No Expenses Logged</p>
                      <p className="text-xs text-[#888888]">
                        Click &ldquo;AI Scan Receipt&rdquo; to capture receipts or upload bills into the live expense ledger.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FAFAF9]">
                    <td className="p-3 text-xs text-[#555555] whitespace-nowrap">
                      {formatDate(exp.invoiceDate)}
                    </td>
                    <td className="p-3 text-xs">
                      <div className="font-bold text-[#111111]">{exp.vendorName}</div>
                      <div className="text-[10px] text-[#777777] font-mono">
                        Inv #{exp.invoiceNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-[#333333] font-medium">
                      {exp.employeeName}
                    </td>
                    <td className="p-3 text-xs text-[#666666]">{exp.category}</td>
                    <td className="p-3 text-right num-tabular text-xs">
                      <CurrencyDisplay paise={exp.subtotalPaise} />
                    </td>
                    <td className="p-3 text-right num-tabular text-xs">
                      <CurrencyDisplay paise={exp.totalTaxPaise} />
                    </td>
                    <td className="p-3 text-right num-tabular text-xs font-bold">
                      <CurrencyDisplay paise={exp.grandTotalPaise} />
                    </td>
                    <td className="p-3 text-center text-xs">
                      {exp.isReimbursable ? (
                        <span className="text-[#137333] font-medium">Yes (Pending)</span>
                      ) : (
                        <span className="text-[#777777]">Corp Card</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Badge status={exp.status} />
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedExpense(exp)}
                        title="Inspect Document"
                      >
                        <Eye size={13} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inspect Expense Drawer / Details Modal */}
      {selectedExpense && (
        <Card title={`Expense Details: ${selectedExpense.title}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-[#777777] uppercase block">Vendor Name</span>
              <span className="font-bold">{selectedExpense.vendorName}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#777777] uppercase block">Vendor GSTIN</span>
              <span className="font-mono">{selectedExpense.vendorGstin || 'Not Provided'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#777777] uppercase block">Payment Method</span>
              <span>{selectedExpense.paymentMethod}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#777777] uppercase block">Grand Total</span>
              <CurrencyDisplay paise={selectedExpense.grandTotalPaise} className="font-bold text-sm" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E5E5E5] flex justify-between items-center text-xs">
            <div>
              <span className="font-semibold text-[#555555]">Business Purpose: </span>
              <span>{selectedExpense.businessPurpose}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedExpense(null)}>
              Close
            </Button>
          </div>
        </Card>
      )}

      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </WebLayout>
  );
}
