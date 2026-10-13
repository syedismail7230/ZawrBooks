'use client';

import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { globalDataStore } from '@/lib/store/dataStore';
import { formatDate } from '@/lib/utils';
import { Scan, Filter } from 'lucide-react';

export default function MobileSubmissionsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const employee = storeState.currentUser;
  const myExpenses = storeState.expenses.filter((e) => e.employeeId === employee.id);

  const filtered = myExpenses.filter((e) => {
    if (statusFilter === 'ALL') return true;
    return e.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <MobileLayout>
      <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
            My Expense Submissions
          </h1>
          <p className="text-[11px] text-[#666666]">
            Lifecycle from Draft to Manager Approval & Reimbursement
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsScannerOpen(true)}>
          <Scan size={12} /> Scan
        </Button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
        {['ALL', 'Submitted', 'Approved', 'Returned', 'Rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-2.5 py-1 border transition-colors whitespace-nowrap ${
              statusFilter === st
                ? 'bg-black text-white border-black font-semibold'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-8 text-center text-xs text-[#777777]">
            No submissions found under this status filter.
          </div>
        ) : (
          filtered.map((exp) => (
            <Card key={exp.id} noPadding>
              <div className="p-3 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-bold text-[#111111]">{exp.vendorName}</h3>
                    <p className="text-[11px] text-[#555555]">{exp.title}</p>
                    <span className="text-[10px] text-[#888888] font-mono block mt-0.5">
                      Inv #{exp.invoiceNumber} • {formatDate(exp.invoiceDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <CurrencyDisplay paise={exp.grandTotalPaise} className="font-bold text-xs" />
                    <Badge status={exp.status} className="mt-1 block" />
                  </div>
                </div>

                {/* Status Lifecycle Indicator */}
                <div className="mt-3 pt-2.5 border-t border-[#F0EFEA] flex items-center justify-between text-[10px] text-[#666666]">
                  <span>Reimbursement: <strong>{exp.reimbursementStatus || 'Pending'}</strong></span>
                  {exp.approverName && (
                    <span>Approver: <strong>{exp.approverName}</strong></span>
                  )}
                </div>

                {exp.comments && exp.comments.length > 0 && (
                  <div className="mt-2 p-2 bg-[#F4F3EF] border-l-2 border-[#111111] text-[10px]">
                    <div className="font-semibold text-[#111111]">{exp.comments[0].author}:</div>
                    <div className="text-[#444444]">{exp.comments[0].text}</div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </MobileLayout>
  );
}
