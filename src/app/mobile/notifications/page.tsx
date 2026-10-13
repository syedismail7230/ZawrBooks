'use client';

import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card } from '@/components/common/Card';
import { globalDataStore } from '@/lib/store/dataStore';
import { formatDate } from '@/lib/utils';
import { Bell, CheckCircle, MessageSquare, AlertCircle } from 'lucide-react';

export default function MobileNotificationsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const employee = storeState.currentUser;
  const myExpenses = storeState.expenses.filter((e) => e.employeeId === employee.id);

  // Generate real notifications purely from employee's actual submissions
  const notifications = myExpenses.map((exp) => ({
    id: exp.id,
    title:
      exp.status === 'Approved'
        ? `Expense Approved: ${exp.vendorName}`
        : exp.status === 'Rejected'
        ? `Expense Rejected: ${exp.vendorName}`
        : exp.status === 'Returned'
        ? `Returned for Correction: ${exp.vendorName}`
        : `Submission Received: ${exp.vendorName}`,
    message: exp.comments && exp.comments.length > 0
      ? `${exp.comments[0].author}: "${exp.comments[0].text}"`
      : `Current status is ${exp.status}. Amount: ₹ ${(exp.grandTotalPaise / 100).toFixed(2)}.`,
    date: formatDate(exp.createdAt),
    status: exp.status,
  }));

  return (
    <MobileLayout>
      <div className="pb-2 border-b border-[#E5E5E5]">
        <h1 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
          Activity & Approver Notifications
        </h1>
        <p className="text-[11px] text-[#666666]">
          Real-time updates on approvals, queries, and reimbursements
        </p>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-8 text-center text-xs text-[#777777]">
            No activity notifications. When you submit an expense, status updates and approver comments will appear here.
          </div>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} noPadding>
              <div className="p-3 bg-white flex items-start gap-3">
                <div className="p-2 bg-[#F4F3EF] border border-[#E5E5E5] shrink-0 mt-0.5">
                  {n.status === 'Approved' ? (
                    <CheckCircle size={14} className="text-[#137333]" />
                  ) : n.status === 'Rejected' || n.status === 'Returned' ? (
                    <AlertCircle size={14} className="text-[#C5221F]" />
                  ) : (
                    <Bell size={14} className="text-[#111111]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xs font-bold text-[#111111]">{n.title}</h3>
                    <span className="text-[9px] text-[#888888] font-mono">{n.date}</span>
                  </div>
                  <p className="text-[11px] text-[#555555] mt-1">{n.message}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
