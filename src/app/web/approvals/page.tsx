'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { ExpenseSubmission } from '@/types';
import { formatDate } from '@/lib/utils';
import { Check, X, RotateCcw, AlertCircle, ShieldAlert } from 'lucide-react';

export default function ApprovalsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [actionMessage, setActionMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const pendingExpenses = storeState.expenses.filter(
    (e) => e.status === 'Submitted' || e.status === 'Under Review'
  );

  const handleDecision = (
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

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Financial Approval Queue
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Pending employee expenses and vendor disbursements requiring managerial authorization
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-white border border-[#E5E5E5] px-3 py-1.5">
          <ShieldAlert size={14} className="text-[#B25900]" />
          <span className="text-[#666666]">Active Approver:</span>
          <span className="font-bold text-[#111111]">
            {storeState.currentUser?.fullName || 'Active Approver'} ({storeState.currentUser?.role?.replace('_', ' ') || 'Admin'})
          </span>
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

      <Card noPadding>
        <div className="p-3 border-b border-[#E5E5E5] bg-white flex justify-between items-center text-xs">
          <span className="font-semibold text-[#111111]">
            {pendingExpenses.length} Submissions Awaiting Authorization
          </span>
          <span className="text-[#777777] text-[11px]">
            Enforcing Separation of Duties & Tier Limits
          </span>
        </div>

        {pendingExpenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#777777]">
            No pending submissions awaiting approval. All expenses have been processed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left financial-table">
              <thead>
                <tr>
                  <th className="p-3">Submission Date</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Vendor / Merchant</th>
                  <th className="p-3">Purpose & Details</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Approval Decision</th>
                </tr>
              </thead>
              <tbody>
                {pendingExpenses.map((exp) => {
                  const isOwnSubmission = exp.employeeId === storeState.currentUser.id;

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
                      </td>
                      <td className="p-3 text-xs text-[#444444] max-w-xs">
                        <div>{exp.title}</div>
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
                            onClick={() => handleDecision(exp, 'Approved')}
                            className="bg-[#137333] hover:bg-[#0F5C29] border-[#137333]"
                          >
                            <Check size={12} /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDecision(exp, 'Returned')}
                          >
                            <RotateCcw size={12} /> Return
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDecision(exp, 'Rejected')}
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
    </WebLayout>
  );
}
