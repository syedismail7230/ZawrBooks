'use client';

import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { globalDataStore } from '@/lib/store/dataStore';
import { formatDate } from '@/lib/utils';
import { ExpenseSubmission } from '@/types';
import {
  Scan,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  ChevronRight,
  Receipt,
  Building,
  User,
  CreditCard,
  Calendar,
  Layers,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function MobileDashboardPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseSubmission | null>(null);

  useEffect(() => {
    globalDataStore.syncWithServer();
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const employee = storeState.currentUser;
  const myExpenses = storeState.expenses.filter((e) => e.employeeId === employee?.id);

  const awaitingCount = myExpenses.filter(
    (e) => e.status === 'Submitted' || e.status === 'Under Review'
  ).length;

  const approvedCount = myExpenses.filter((e) => e.status === 'Approved' || e.status === 'Posted').length;
  const returnedCount = myExpenses.filter((e) => e.status === 'Returned' || e.status === 'Rejected').length;

  const totalPaise = myExpenses.reduce((sum, e) => sum + e.grandTotalPaise, 0);

  return (
    <MobileLayout>
      {/* Welcome Hero Banner */}
      <div className="bg-[#111111] text-white p-4 sm:p-5 rounded-none sm:rounded-xl shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
              Zawr Books Mobile
            </div>
            <h1 className="text-base sm:text-lg font-bold mt-0.5">
              Hello, {employee?.fullName || 'User'}
            </h1>
            <p className="text-xs text-gray-300 mt-0.5">
              {employee?.department || 'Operations'} •{' '}
              {storeState.organization?.legalName || storeState.organization?.name || 'Zawr Industries LLP'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white font-mono">
            {employee?.fullName ? employee.fullName.charAt(0) : 'U'}
          </div>
        </div>

        {/* Prominent Scan CTA Button */}
        <div className="mt-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setIsScannerOpen(true)}
            className="w-full bg-white text-black hover:bg-gray-100 font-bold py-2.5 text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-sm"
          >
            <Scan size={16} /> Scan Receipt with AI
          </Button>
        </div>
      </div>

      {/* Interactive Metrics Summary Grid (Links directly to filtered submissions) */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/mobile/submissions?status=Submitted"
          className="bg-white border border-[#E5E5E5] p-3 text-center transition-all hover:border-black active:scale-95 shadow-2xs group"
        >
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-lg font-bold text-[#111111]">{awaitingCount}</span>
          </div>
          <div className="text-[10px] text-[#666666] uppercase mt-1 font-semibold group-hover:text-black">
            Pending
          </div>
        </Link>

        <Link
          href="/mobile/submissions?status=Approved"
          className="bg-white border border-[#E5E5E5] p-3 text-center transition-all hover:border-[#137333] active:scale-95 shadow-2xs group"
        >
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-lg font-bold text-[#137333]">{approvedCount}</span>
          </div>
          <div className="text-[10px] text-[#666666] uppercase mt-1 font-semibold group-hover:text-[#137333]">
            Approved
          </div>
        </Link>

        <Link
          href="/mobile/submissions?status=Returned"
          className="bg-white border border-[#E5E5E5] p-3 text-center transition-all hover:border-[#C5221F] active:scale-95 shadow-2xs group"
        >
          <div className="flex items-center justify-center gap-1">
            {returnedCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>}
            <span className="text-lg font-bold text-[#C5221F]">{returnedCount}</span>
          </div>
          <div className="text-[10px] text-[#666666] uppercase mt-1 font-semibold group-hover:text-[#C5221F]">
            Returned
          </div>
        </Link>
      </div>

      {/* Total Claim Amount Card */}
      <div className="bg-white border border-[#E5E5E5] p-3.5 flex justify-between items-center shadow-2xs">
        <div>
          <div className="text-[10px] text-[#777777] uppercase font-semibold tracking-wider">
            Total Claims ({myExpenses.length} Records)
          </div>
          <div className="text-base font-bold text-[#111111] mt-0.5">
            <CurrencyDisplay paise={totalPaise} />
          </div>
        </div>
        <Link
          href="/mobile/submissions"
          className="text-xs text-[#111111] font-semibold flex items-center gap-1 hover:underline p-1.5 active:scale-95 transition-transform"
        >
          <span>View All</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Recent Submissions Feed */}
      <Card
        title="Recent Submissions"
        subtitle="Tap any submission to inspect status breakdown and details"
        noPadding
      >
        <div className="divide-y divide-[#E5E5E5]">
          {myExpenses.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="inline-flex p-3 bg-[#F4F3EF] rounded-full text-[#666666]">
                <Receipt size={24} />
              </div>
              <p className="text-xs font-semibold text-[#111111]">No expense submissions yet</p>
              <p className="text-[11px] text-[#777777] max-w-xs mx-auto">
                Snap a photo or upload a bill to start AI extraction and automated approval workflow.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsScannerOpen(true)}
                className="mt-2"
              >
                <Scan size={13} /> Scan Your First Receipt
              </Button>
            </div>
          ) : (
            myExpenses.slice(0, 5).map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelectedExpense(exp)}
                className="p-3.5 hover:bg-[#FAFAF9] active:bg-[#F0EFEA] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#111111] truncate">
                      {exp.vendorName || exp.title}
                    </span>
                    <Badge status={exp.status} />
                  </div>
                  <div className="text-[11px] text-[#666666] truncate mt-0.5">
                    {exp.title}
                  </div>
                  <div className="text-[10px] text-[#888888] font-mono mt-0.5 flex items-center gap-2">
                    <span>{formatDate(exp.invoiceDate)}</span>
                    {exp.invoiceNumber && <span>• #{exp.invoiceNumber}</span>}
                  </div>

                  {/* Approver comments snippet if returned */}
                  {exp.status === 'Returned' && exp.comments && exp.comments.length > 0 && (
                    <div className="mt-1.5 p-1.5 bg-[#FEF7E0] border-l-2 border-[#B25900] text-[10px] text-[#B25900] flex items-center gap-1.5">
                      <AlertCircle size={12} className="shrink-0" />
                      <span className="truncate">
                        <strong>Query:</strong> {exp.comments[exp.comments.length - 1].text}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <div className="text-xs font-bold font-mono">
                      <CurrencyDisplay paise={exp.grandTotalPaise} />
                    </div>
                    <div className="text-[9px] text-[#888888] font-mono mt-0.5">
                      {exp.reimbursementStatus || 'Pending'}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-[#CCCCCC] group-hover:text-black transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Expense Detail Bottom Sheet / Modal */}
      {selectedExpense && (
        <Modal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          title="Expense Details"
          subtitle={`Inv #${selectedExpense.invoiceNumber || 'N/A'} • ${formatDate(selectedExpense.invoiceDate)}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {/* Header Status Card */}
            <div className="p-3 bg-[#F4F3EF] border border-[#E5E5E5] flex justify-between items-center">
              <div>
                <div className="text-[10px] text-[#666666] uppercase font-mono">Status</div>
                <div className="mt-0.5">
                  <Badge status={selectedExpense.status} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#666666] uppercase font-mono">Grand Total</div>
                <div className="text-base font-bold font-mono text-[#111111]">
                  <CurrencyDisplay paise={selectedExpense.grandTotalPaise} />
                </div>
              </div>
            </div>

            {/* Returned Alert Banner */}
            {selectedExpense.status === 'Returned' && selectedExpense.comments && (
              <div className="p-3 bg-[#FEF7E0] border border-[#FEEFC3] text-[#B25900] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle size={14} />
                  <span>Returned by Approver for Correction</span>
                </div>
                <p className="text-[11px] pl-5">
                  "{selectedExpense.comments[selectedExpense.comments.length - 1].text}"
                </p>
              </div>
            )}

            {/* Vendor & General Info */}
            <div className="space-y-2 border-b border-[#E5E5E5] pb-3">
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Vendor / Merchant:</span>
                <span className="font-semibold text-[#111111]">{selectedExpense.vendorName}</span>
              </div>
              {selectedExpense.vendorGstin && (
                <div className="flex justify-between items-center font-mono text-[11px]">
                  <span className="text-[#666666]">Vendor GSTIN:</span>
                  <span className="font-semibold text-[#111111]">{selectedExpense.vendorGstin}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Category:</span>
                <span className="font-medium text-[#111111]">{selectedExpense.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Department:</span>
                <span className="font-medium text-[#111111]">{selectedExpense.department}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Payment Method:</span>
                <span className="font-medium text-[#111111]">{selectedExpense.paymentMethod}</span>
              </div>
              {selectedExpense.businessPurpose && (
                <div className="pt-1">
                  <span className="text-[#666666] block mb-0.5">Business Purpose:</span>
                  <p className="p-2 bg-[#F4F3EF] text-[#333333] text-[11px] rounded-none">
                    {selectedExpense.businessPurpose}
                  </p>
                </div>
              )}
            </div>

            {/* Tax Breakdown */}
            <div className="space-y-1.5 border-b border-[#E5E5E5] pb-3 font-mono text-[11px]">
              <div className="flex justify-between items-center text-[#666666]">
                <span>Subtotal (Net Amount):</span>
                <span><CurrencyDisplay paise={selectedExpense.subtotalPaise} /></span>
              </div>
              {selectedExpense.cgstPaise > 0 && (
                <div className="flex justify-between items-center text-[#666666]">
                  <span>CGST:</span>
                  <span><CurrencyDisplay paise={selectedExpense.cgstPaise} /></span>
                </div>
              )}
              {selectedExpense.sgstPaise > 0 && (
                <div className="flex justify-between items-center text-[#666666]">
                  <span>SGST:</span>
                  <span><CurrencyDisplay paise={selectedExpense.sgstPaise} /></span>
                </div>
              )}
              {selectedExpense.igstPaise > 0 && (
                <div className="flex justify-between items-center text-[#666666]">
                  <span>IGST:</span>
                  <span><CurrencyDisplay paise={selectedExpense.igstPaise} /></span>
                </div>
              )}
              <div className="flex justify-between items-center font-bold text-xs text-[#111111] pt-1 border-t border-dashed border-[#CCCCCC]">
                <span>Total Amount:</span>
                <span><CurrencyDisplay paise={selectedExpense.grandTotalPaise} /></span>
              </div>
            </div>

            {/* Approver & Audit Details */}
            {selectedExpense.approverName && (
              <div className="text-[11px] text-[#666666] space-y-1">
                <div>
                  Approver: <strong>{selectedExpense.approverName}</strong>
                </div>
                {selectedExpense.approvedAt && (
                  <div>
                    Decided At: <strong>{formatDate(selectedExpense.approvedAt)}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedExpense(null)}
                className="flex-1"
              >
                Close
              </Button>
              <Link
                href="/mobile/submissions"
                className="flex-1"
                onClick={() => setSelectedExpense(null)}
              >
                <Button variant="primary" size="md" className="w-full">
                  Go to Submissions
                </Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {/* Global AI Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </MobileLayout>
  );
}
