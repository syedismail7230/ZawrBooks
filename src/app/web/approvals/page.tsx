'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { ExpenseSubmission, VendorBill } from '@/types';
import { formatDate } from '@/lib/utils';
import { Check, X, RotateCcw, AlertCircle, ShieldAlert, FileText, Briefcase, CheckSquare, RefreshCw } from 'lucide-react';

export default function ApprovalsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [activeTab, setActiveTab] = useState<'ALL' | 'EXPENSES' | 'BILLS'>('ALL');
  const [actionMessage, setActionMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    globalDataStore.syncWithServer();
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const pendingExpenses = storeState.expenses.filter(
    (e) => e.status === 'Submitted' || e.status === 'Under Review'
  );

  const pendingBills = storeState.vendorBills.filter(
    (b) => b.status === 'Submitted' || b.status === 'Draft'
  );

  const totalPending = pendingExpenses.length + pendingBills.length;

  const handleExpenseDecision = (
    expense: ExpenseSubmission,
    decision: 'Approved' | 'Rejected' | 'Returned'
  ) => {
    const comment = window.prompt(
      `Enter optional comment for ${decision.toLowerCase()} expense "${expense.title}":`,
      decision === 'Approved' ? 'Verified with supporting receipt' : 'Requires clarification'
    );

    const res = globalDataStore.reviewExpense(expense.id, decision, comment || undefined);
    if (res.success) {
      fetch('/api/email/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVAL_DECISION',
          payload: {
            expense,
            decision,
            comment: comment || undefined,
          },
        }),
      }).catch(console.error);

      setActionMessage({
        type: 'success',
        text: `Expense "${expense.title}" has been marked as ${decision}. Audit notification emailed to submitter & admin.`,
      });
    } else {
      setActionMessage({
        type: 'error',
        text: res.error || `Failed to process ${decision}.`,
      });
    }
  };

  const handleBillDecision = (
    bill: VendorBill,
    decision: 'Approved' | 'Rejected' | 'Returned'
  ) => {
    const comment = window.prompt(
      `Enter optional comment for ${decision.toLowerCase()} vendor bill "${bill.billNumber}":`,
      decision === 'Approved' ? 'Approved for payment disbursement' : 'Requires vendor clarification'
    );

    const res = globalDataStore.reviewVendorBill(bill.id, decision, comment || undefined);
    if (res.success) {
      setActionMessage({
        type: 'success',
        text: `Vendor Bill "${bill.billNumber}" from ${bill.vendorName} has been marked as ${decision}.`,
      });
    } else {
      setActionMessage({
        type: 'error',
        text: res.error || `Failed to process ${decision}.`,
      });
    }
  };

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
            <CheckSquare size={16} /> Financial Approval Queue
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Pending employee expense claims and vendor bills requiring managerial authorization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              globalDataStore.syncWithServer();
              setActionMessage({ type: 'success', text: 'Queue synchronized with server data.' });
              setTimeout(() => setActionMessage(null), 2500);
            }}
          >
            <RefreshCw size={13} /> Sync Queue
          </Button>

          <div className="flex items-center gap-2 text-xs bg-white border border-[#E5E5E5] px-3 py-1.5">
            <ShieldAlert size={14} className="text-[#B25900]" />
            <span className="text-[#666666]">Active Approver:</span>
            <span className="font-bold text-[#111111]">
              {storeState.currentUser?.fullName || 'Active Approver'} ({storeState.currentUser?.role?.replace('_', ' ') || 'Admin'})
            </span>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3 border text-xs font-medium flex items-center justify-between ${
            actionMessage.type === 'error'
              ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
              : 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold text-xs">
            ✕
          </button>
        </div>
      )}

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
          All Awaiting Authorization ({totalPending})
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
          <span>Expense Claims ({pendingExpenses.length})</span>
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
          <span>Vendor & Supplier Bills ({pendingBills.length})</span>
        </button>
      </div>

      {/* Expense Submissions Queue */}
      {(activeTab === 'ALL' || activeTab === 'EXPENSES') && (
        <Card noPadding>
          <div className="p-3 border-b border-[#E5E5E5] bg-white flex justify-between items-center text-xs">
            <span className="font-semibold text-[#111111] flex items-center gap-1.5">
              <FileText size={14} /> Employee Expense Claims ({pendingExpenses.length})
            </span>
            <span className="text-[#777777] text-[11px]">
              Enforcing Separation of Duties & Tier Limits
            </span>
          </div>

          {pendingExpenses.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#777777]">
              No pending employee expenses awaiting authorization.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left financial-table">
                <thead>
                  <tr>
                    <th className="p-3">Submission Date</th>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Vendor / Merchant</th>
                    <th className="p-3">Purpose & Category</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Approval Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingExpenses.map((exp) => {
                    const isOwnSubmission = exp.employeeId === storeState.currentUser?.id;

                    return (
                      <tr key={exp.id} className="hover:bg-[#FAFAF9]">
                        <td className="p-3 text-xs text-[#555555]">
                          {formatDate(exp.createdAt)}
                        </td>
                        <td className="p-3 text-xs font-semibold text-[#111111]">
                          {exp.employeeName}
                          {isOwnSubmission && (
                            <span className="block text-[10px] text-[#C5221F] font-normal">
                              (Your Own Submission)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          <div className="font-medium text-[#111111]">{exp.vendorName}</div>
                          <div className="text-[10px] text-[#777777] font-mono">
                            {exp.invoiceNumber}
                          </div>
                          {exp.vendorGstin && (
                            <div className="text-[9px] text-[#999999] font-mono">
                              GSTIN: {exp.vendorGstin}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-xs text-[#444444] max-w-xs">
                          <div className="font-medium">{exp.title}</div>
                          <div className="text-[10px] text-[#888888] truncate">
                            {exp.businessPurpose}
                          </div>
                        </td>
                        <td className="p-3 text-right num-tabular text-xs font-bold">
                          <CurrencyDisplay paise={exp.grandTotalPaise} />
                        </td>
                        <td className="p-3 text-center">
                          <Badge status={exp.status} />
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleExpenseDecision(exp, 'Approved')}
                              className="bg-[#137333] hover:bg-[#0F5C29] border-[#137333]"
                            >
                              <Check size={12} /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExpenseDecision(exp, 'Returned')}
                            >
                              <RotateCcw size={12} /> Return
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleExpenseDecision(exp, 'Rejected')}
                            >
                              <X size={12} /> Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Vendor & Supplier Bills Queue */}
      {(activeTab === 'ALL' || activeTab === 'BILLS') && (
        <Card noPadding>
          <div className="p-3 border-b border-[#E5E5E5] bg-white flex justify-between items-center text-xs">
            <span className="font-semibold text-[#111111] flex items-center gap-1.5">
              <Briefcase size={14} /> Vendor & Supplier Bills ({pendingBills.length})
            </span>
            <span className="text-[#777777] text-[11px]">
              Trade Payables Authorization
            </span>
          </div>

          {pendingBills.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#777777]">
              No vendor bills pending payment authorization.
            </div>
          ) : (
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
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Authorization</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-[#FAFAF9]">
                      <td className="p-3 text-xs text-[#555555]">
                        {formatDate(bill.billDate)}
                      </td>
                      <td className="p-3 text-xs font-semibold text-[#111111]">
                        {bill.vendorName}
                      </td>
                      <td className="p-3 text-xs font-mono font-medium text-[#333333]">
                        {bill.billNumber}
                      </td>
                      <td className="p-3 text-xs text-[#666666]">
                        {formatDate(bill.dueDate)}
                      </td>
                      <td className="p-3 text-right num-tabular text-xs">
                        <CurrencyDisplay paise={bill.subtotalPaise} />
                      </td>
                      <td className="p-3 text-right num-tabular text-xs text-[#666666]">
                        <CurrencyDisplay paise={bill.taxPaise} />
                      </td>
                      <td className="p-3 text-right num-tabular text-xs font-bold text-[#111111]">
                        <CurrencyDisplay paise={bill.totalPaise} />
                      </td>
                      <td className="p-3 text-center">
                        <Badge status={bill.status} />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleBillDecision(bill, 'Approved')}
                            className="bg-[#137333] hover:bg-[#0F5C29] border-[#137333]"
                          >
                            <Check size={12} /> Authorize Bill
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBillDecision(bill, 'Returned')}
                          >
                            <RotateCcw size={12} /> Return
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleBillDecision(bill, 'Rejected')}
                          >
                            <X size={12} /> Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </WebLayout>
  );
}
