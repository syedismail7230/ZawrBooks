'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { globalDataStore } from '@/lib/store/dataStore';
import { formatDate } from '@/lib/utils';
import { ExpenseSubmission } from '@/types';
import { rupeesToPaise } from '@/lib/accounting/engine';
import {
  Scan,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Receipt,
  RotateCw,
  Send,
  Building,
  CreditCard,
} from 'lucide-react';

function SubmissionsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams?.get('status') || 'ALL';

  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Correction & Resubmission modal state
  const [editingExpense, setEditingExpense] = useState<ExpenseSubmission | null>(null);
  const [editVendor, setEditVendor] = useState('');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editInvoiceDate, setEditInvoiceDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editGrandTotalRupees, setEditGrandTotalRupees] = useState('');
  const [editBusinessPurpose, setEditBusinessPurpose] = useState('');

  useEffect(() => {
    globalDataStore.syncWithServer();
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  // Update filter if url param changes
  useEffect(() => {
    if (searchParams?.get('status')) {
      setStatusFilter(searchParams.get('status')!);
    }
  }, [searchParams]);

  const employee = storeState.currentUser;
  const myExpenses = storeState.expenses.filter((e) => e.employeeId === employee?.id);

  const awaitingCount = myExpenses.filter(
    (e) => e.status === 'Submitted' || e.status === 'Under Review'
  ).length;
  const approvedCount = myExpenses.filter((e) => e.status === 'Approved' || e.status === 'Posted').length;
  const returnedCount = myExpenses.filter((e) => e.status === 'Returned').length;
  const rejectedCount = myExpenses.filter((e) => e.status === 'Rejected').length;

  const filtered = myExpenses.filter((e) => {
    // Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter.toLowerCase() === 'pending' || statusFilter.toLowerCase() === 'submitted') {
        if (e.status !== 'Submitted' && e.status !== 'Under Review') return false;
      } else if (e.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchVendor = e.vendorName?.toLowerCase().includes(q);
      const matchInv = e.invoiceNumber?.toLowerCase().includes(q);
      const matchTitle = e.title?.toLowerCase().includes(q);
      const matchCategory = e.category?.toLowerCase().includes(q);
      if (!matchVendor && !matchInv && !matchTitle && !matchCategory) return false;
    }

    return true;
  });

  const handleStartCorrection = (exp: ExpenseSubmission) => {
    setEditingExpense(exp);
    setEditVendor(exp.vendorName || '');
    setEditInvoiceNumber(exp.invoiceNumber || '');
    setEditInvoiceDate(exp.invoiceDate || '');
    setEditCategory(exp.category || 'Travel & Business Conveyance');
    setEditGrandTotalRupees((exp.grandTotalPaise / 100).toFixed(2));
    setEditBusinessPurpose(exp.businessPurpose || '');
  };

  const handleSaveCorrection = () => {
    if (!editingExpense) return;
    const newTotalPaise = rupeesToPaise(editGrandTotalRupees);

    globalDataStore.updateExpense(editingExpense.id, {
      vendorName: editVendor,
      invoiceNumber: editInvoiceNumber,
      invoiceDate: editInvoiceDate,
      category: editCategory,
      grandTotalPaise: newTotalPaise,
      businessPurpose: editBusinessPurpose,
      title: `${editCategory}: ${editVendor}`,
    });

    setEditingExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm('Are you sure you want to withdraw and delete this expense submission?')) {
      globalDataStore.deleteExpense(id);
    }
  };

  return (
    <>
      {/* Header bar */}
      <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
            My Expense Claims
          </h1>
          <p className="text-[11px] text-[#666666]">
            Realtime tracker for submissions, approvals & reimbursement
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsScannerOpen(true)}
          className="flex items-center gap-1 active:scale-95"
        >
          <Scan size={12} /> Scan
        </Button>
      </div>

      {/* Live Search Bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by vendor, invoice #, category..."
          className="w-full bg-white border border-[#CCCCCC] focus:border-black outline-none pl-8 pr-3 py-1.5 text-xs placeholder:text-gray-400 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#888888] hover:text-black"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Interactive Filter Chips with Live Badges */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
        {[
          { key: 'ALL', label: 'All', count: myExpenses.length },
          { key: 'Submitted', label: 'Pending', count: awaitingCount },
          { key: 'Approved', label: 'Approved', count: approvedCount },
          { key: 'Returned', label: 'Returned', count: returnedCount, alert: returnedCount > 0 },
          { key: 'Rejected', label: 'Rejected', count: rejectedCount },
        ].map((f) => {
          const isSelected =
            statusFilter.toLowerCase() === f.key.toLowerCase() ||
            (f.key === 'Submitted' && statusFilter.toLowerCase() === 'pending');

          return (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-2.5 py-1.5 border transition-all whitespace-nowrap flex items-center gap-1.5 active:scale-95 text-xs ${
                isSelected
                  ? 'bg-black text-white border-black font-bold shadow-2xs'
                  : 'bg-white text-gray-700 border-[#D5D5D0] hover:border-black'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] font-mono px-1 rounded-xs ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : f.alert
                    ? 'bg-rose-100 text-rose-700 font-bold'
                    : 'bg-[#F4F3EF] text-gray-600'
                }`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-8 text-center space-y-2">
            <div className="inline-flex p-3 bg-[#F4F3EF] rounded-full text-[#777777]">
              <Receipt size={22} />
            </div>
            <p className="text-xs font-semibold text-[#111111]">No matching expense records</p>
            <p className="text-[11px] text-[#777777]">
              {searchQuery
                ? `No submissions found matching "${searchQuery}"`
                : 'No expenses submitted under this status category.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="mt-2"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          filtered.map((exp) => {
            const isExpanded = expandedId === exp.id;

            return (
              <Card key={exp.id} noPadding className="shadow-2xs">
                <div className="p-3.5 bg-white">
                  {/* Top line: Vendor and Amount */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                    className="flex justify-between items-start cursor-pointer select-none"
                  >
                    <div className="pr-2">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-[#111111]">
                          {exp.vendorName || exp.title}
                        </h3>
                        {exp.status === 'Returned' && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#555555] line-clamp-1 mt-0.5">{exp.title}</p>
                      <span className="text-[10px] text-[#888888] font-mono block mt-0.5">
                        Inv #{exp.invoiceNumber || 'N/A'} • {formatDate(exp.invoiceDate)}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <CurrencyDisplay
                        paise={exp.grandTotalPaise}
                        className="font-bold text-xs font-mono"
                      />
                      <Badge status={exp.status} className="mt-1 block text-right" />
                    </div>
                  </div>

                  {/* Approver Query Banner if Returned */}
                  {exp.status === 'Returned' && exp.comments && exp.comments.length > 0 && (
                    <div className="mt-3 p-2.5 bg-[#FEF7E0] border border-[#FEEFC3] text-xs text-[#B25900] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1 text-[11px]">
                          <AlertCircle size={13} /> Approver Query / Correction Needed
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStartCorrection(exp)}
                          className="bg-[#B25900] hover:bg-[#8C4600] text-white text-[10px] py-0.5 px-2 font-bold"
                        >
                          <Edit3 size={11} /> Fix & Resubmit
                        </Button>
                      </div>
                      <p className="text-[11px] text-[#6E3800] pl-4 font-normal">
                        "{exp.comments[exp.comments.length - 1].text}"
                      </p>
                    </div>
                  )}

                  {/* Expand/Collapse Toggle Button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                    className="mt-2 pt-2 border-t border-[#F0EFEA] w-full flex items-center justify-between text-[10px] text-[#666666] hover:text-black font-medium"
                  >
                    <span>
                      Reimbursement: <strong>{exp.reimbursementStatus || 'Pending'}</strong>
                      {exp.approverName && <> • By <strong>{exp.approverName}</strong></>}
                    </span>
                    <span className="flex items-center gap-0.5">
                      {isExpanded ? (
                        <>Less details <ChevronUp size={12} /></>
                      ) : (
                        <>More details <ChevronDown size={12} /></>
                      )}
                    </span>
                  </button>

                  {/* Expanded Inspector Panel */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#E5E5E5] space-y-2 text-[11px] animate-in fade-in duration-150">
                      <div className="grid grid-cols-2 gap-2 p-2 bg-[#F4F3EF] border border-[#E5E5E5]">
                        <div>
                          <span className="text-[#777777] block text-[9px] uppercase font-mono">
                            Category
                          </span>
                          <span className="font-semibold text-[#111111]">{exp.category}</span>
                        </div>
                        <div>
                          <span className="text-[#777777] block text-[9px] uppercase font-mono">
                            Department
                          </span>
                          <span className="font-semibold text-[#111111]">{exp.department}</span>
                        </div>
                        <div>
                          <span className="text-[#777777] block text-[9px] uppercase font-mono">
                            Payment Method
                          </span>
                          <span className="font-semibold text-[#111111]">{exp.paymentMethod}</span>
                        </div>
                        <div>
                          <span className="text-[#777777] block text-[9px] uppercase font-mono">
                            Vendor GSTIN
                          </span>
                          <span className="font-mono text-[#111111]">{exp.vendorGstin || 'None'}</span>
                        </div>
                      </div>

                      {/* Tax Breakdown */}
                      <div className="p-2 border border-[#E5E5E5] space-y-1 font-mono text-[10px]">
                        <div className="flex justify-between text-[#666666]">
                          <span>Net Subtotal:</span>
                          <span><CurrencyDisplay paise={exp.subtotalPaise} /></span>
                        </div>
                        {exp.totalTaxPaise > 0 && (
                          <div className="flex justify-between text-[#666666]">
                            <span>GST (Taxes):</span>
                            <span><CurrencyDisplay paise={exp.totalTaxPaise} /></span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-xs text-[#111111] pt-1 border-t border-dashed border-[#CCCCCC]">
                          <span>Grand Total:</span>
                          <span><CurrencyDisplay paise={exp.grandTotalPaise} /></span>
                        </div>
                      </div>

                      {exp.businessPurpose && (
                        <div className="p-2 bg-[#FAFAF9] border border-[#E5E5E5]">
                          <span className="text-[#777777] block text-[9px] uppercase font-mono mb-0.5">
                            Business Purpose
                          </span>
                          <p className="text-[#333333]">{exp.businessPurpose}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-2 flex justify-between items-center gap-2">
                        {exp.status === 'Returned' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStartCorrection(exp)}
                            className="flex items-center gap-1 bg-[#111111] text-xs"
                          >
                            <Edit3 size={12} /> Correct & Resubmit
                          </Button>
                        )}

                        {(exp.status === 'Submitted' || exp.status === 'Returned') && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-[#C5221F] hover:text-black flex items-center gap-1 text-[10px] font-semibold p-1 transition-colors"
                            title="Withdraw Submission"
                          >
                            <Trash2 size={12} />
                            <span>Withdraw Claim</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit / Resubmission Modal */}
      {editingExpense && (
        <Modal
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          title="Correct & Resubmit Expense"
          subtitle={`Resolve approver query for ${editingExpense.vendorName}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            {editingExpense.comments && editingExpense.comments.length > 0 && (
              <div className="p-2.5 bg-[#FEF7E0] border border-[#FEEFC3] text-[#B25900] space-y-0.5">
                <span className="font-bold text-[11px] block">Approver Remark:</span>
                <p className="text-[11px]">{editingExpense.comments[editingExpense.comments.length - 1].text}</p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Merchant / Vendor Name
              </label>
              <input
                type="text"
                value={editVendor}
                onChange={(e) => setEditVendor(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={editInvoiceNumber}
                  onChange={(e) => setEditInvoiceNumber(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#666666] mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={editInvoiceDate}
                  onChange={(e) => setEditInvoiceDate(e.target.value)}
                  className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Category
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none"
              >
                <option value="Travel & Business Conveyance">Travel & Business Conveyance</option>
                <option value="Cloud Infrastructure & Hosting">Cloud Infrastructure & Hosting</option>
                <option value="Office Rent & Facilities">Office Rent & Facilities</option>
                <option value="Software Subscriptions & SaaS">Software Subscriptions & SaaS</option>
                <option value="Meals & Client Entertainment">Meals & Client Entertainment</option>
                <option value="General Office Supplies">General Office Supplies</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Total Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={editGrandTotalRupees}
                onChange={(e) => setEditGrandTotalRupees(e.target.value)}
                className="w-full bg-white border border-black p-1.5 text-xs focus:border-black outline-none font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#666666] mb-1">
                Clarification / Updated Purpose
              </label>
              <textarea
                rows={2}
                value={editBusinessPurpose}
                onChange={(e) => setEditBusinessPurpose(e.target.value)}
                placeholder="Address the approver's query and note the changes made"
                className="w-full bg-white border border-[#CCCCCC] p-1.5 text-xs focus:border-black outline-none"
              />
            </div>

            <div className="pt-2 flex justify-between items-center gap-2 border-t border-[#E5E5E5]">
              <Button variant="outline" size="md" onClick={() => setEditingExpense(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveCorrection}
                className="flex items-center gap-1.5"
              >
                <Send size={13} /> Resubmit for Approval
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Global AI Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </>
  );
}

export default function MobileSubmissionsPage() {
  return (
    <MobileLayout>
      <Suspense fallback={<div className="p-8 text-center text-xs text-[#777777]">Loading submissions...</div>}>
        <SubmissionsContent />
      </Suspense>
    </MobileLayout>
  );
}
