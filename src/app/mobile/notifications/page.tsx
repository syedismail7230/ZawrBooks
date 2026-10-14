'use client';

import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { globalDataStore } from '@/lib/store/dataStore';
import { formatDate } from '@/lib/utils';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  Check,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

export default function MobileNotificationsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [filterType, setFilterType] = useState<'ALL' | 'ACTION_REQUIRED' | 'APPROVED'>('ALL');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const employee = storeState.currentUser;
  const myExpenses = storeState.expenses.filter((e) => e.employeeId === employee?.id);

  // Derive real notifications from employee's actual submissions and comments
  const rawNotifications = myExpenses.map((exp) => {
    const isReturned = exp.status === 'Returned';
    const isRejected = exp.status === 'Rejected';
    const isApproved = exp.status === 'Approved' || exp.status === 'Posted';
    const hasComments = exp.comments && exp.comments.length > 0;
    const latestComment = hasComments ? exp.comments![exp.comments!.length - 1] : null;

    let title = `Submission Received: ${exp.vendorName || exp.title}`;
    let category: 'action_required' | 'approved' | 'info' = 'info';

    if (isReturned) {
      title = `Returned for Query: ${exp.vendorName || exp.title}`;
      category = 'action_required';
    } else if (isRejected) {
      title = `Claim Rejected: ${exp.vendorName || exp.title}`;
      category = 'action_required';
    } else if (isApproved) {
      title = `Expense Approved: ${exp.vendorName || exp.title}`;
      category = 'approved';
    }

    return {
      id: exp.id,
      expenseId: exp.id,
      title,
      vendorName: exp.vendorName,
      amountPaise: exp.grandTotalPaise,
      message: latestComment
        ? `${latestComment.author}: "${latestComment.text}"`
        : `Status is currently marked as ${exp.status}.`,
      date: exp.approvedAt ? formatDate(exp.approvedAt) : formatDate(exp.createdAt),
      status: exp.status,
      category,
      approverName: exp.approverName,
      isActionRequired: isReturned || isRejected,
    };
  });

  const notifications = rawNotifications
    .filter((n) => !dismissedIds.includes(n.id))
    .filter((n) => {
      if (filterType === 'ACTION_REQUIRED') return n.isActionRequired;
      if (filterType === 'APPROVED') return n.category === 'approved';
      return true;
    });

  const actionRequiredCount = rawNotifications.filter((n) => n.isActionRequired).length;

  return (
    <MobileLayout>
      <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
            Activity & Notifications
          </h1>
          <p className="text-[11px] text-[#666666]">
            Realtime notifications on approvals, queries & updates
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={() => setDismissedIds(rawNotifications.map((n) => n.id))}
            className="text-[10px] text-[#666666] hover:text-black font-medium transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1 border transition-colors ${
            filterType === 'ALL'
              ? 'bg-black text-white border-black font-semibold'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          All ({rawNotifications.length})
        </button>
        <button
          onClick={() => setFilterType('ACTION_REQUIRED')}
          className={`px-3 py-1 border transition-colors flex items-center gap-1 ${
            filterType === 'ACTION_REQUIRED'
              ? 'bg-[#C5221F] text-white border-[#C5221F] font-semibold'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          <span>Action Required</span>
          {actionRequiredCount > 0 && (
            <span className="bg-white text-[#C5221F] text-[9px] font-bold px-1 rounded-full">
              {actionRequiredCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilterType('APPROVED')}
          className={`px-3 py-1 border transition-colors ${
            filterType === 'APPROVED'
              ? 'bg-[#137333] text-white border-[#137333] font-semibold'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          Approved
        </button>
      </div>

      {/* Notifications Stream */}
      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-8 text-center space-y-2 shadow-2xs">
            <div className="inline-flex p-3 bg-[#F4F3EF] rounded-full text-[#777777]">
              <Bell size={22} />
            </div>
            <p className="text-xs font-semibold text-[#111111]">No notifications at this time</p>
            <p className="text-[11px] text-[#777777] max-w-xs mx-auto">
              Whenever you submit an expense or an approver posts remarks or approvals, live alerts will appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} noPadding className="shadow-2xs">
              <div
                className={`p-3 bg-white flex items-start gap-3 border-l-4 ${
                  n.status === 'Approved' || n.status === 'Posted'
                    ? 'border-l-[#137333]'
                    : n.isActionRequired
                    ? 'border-l-[#C5221F]'
                    : 'border-l-[#111111]'
                }`}
              >
                <div className="p-2 bg-[#F4F3EF] border border-[#E5E5E5] shrink-0 mt-0.5">
                  {n.status === 'Approved' || n.status === 'Posted' ? (
                    <CheckCircle2 size={16} className="text-[#137333]" />
                  ) : n.isActionRequired ? (
                    <AlertCircle size={16} className="text-[#C5221F]" />
                  ) : (
                    <Clock size={16} className="text-[#111111]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-xs font-bold text-[#111111] truncate">{n.title}</h3>
                    <span className="text-[9px] text-[#888888] font-mono shrink-0">{n.date}</span>
                  </div>

                  <p className="text-[11px] text-[#444444] mt-1 break-words">{n.message}</p>

                  <div className="mt-2.5 pt-2 border-t border-[#F0EFEA] flex justify-between items-center text-[10px]">
                    <div className="font-mono font-bold text-[#111111]">
                      <CurrencyDisplay paise={n.amountPaise} />
                    </div>

                    <Link
                      href={`/mobile/submissions?status=${n.status}`}
                      className="text-[#111111] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>View in Submissions</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
