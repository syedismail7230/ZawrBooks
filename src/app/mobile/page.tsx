'use client';

import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { CurrencyDisplay } from '@/components/common/CurrencyDisplay';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { BrandLogo } from '@/components/common/BrandLogo';
import { globalDataStore } from '@/lib/store/dataStore';
import { formatDate } from '@/lib/utils';
import { Scan, Clock, CheckCircle2, AlertCircle, ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';

export default function MobileDashboardPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const employee = storeState.currentUser;
  const myExpenses = storeState.expenses.filter((e) => e.employeeId === employee.id);

  const awaitingCount = myExpenses.filter(
    (e) => e.status === 'Submitted' || e.status === 'Under Review'
  ).length;

  const approvedCount = myExpenses.filter((e) => e.status === 'Approved' || e.status === 'Posted').length;
  const rejectedCount = myExpenses.filter((e) => e.status === 'Rejected' || e.status === 'Returned').length;

  const totalPaise = myExpenses.reduce((sum, e) => sum + e.grandTotalPaise, 0);

  return (
    <MobileLayout>
      {/* Welcome Hero Banner */}
      <div className="bg-[#111111] text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BrandLogo variant="icon" className="w-5 h-5 shrink-0" />
            <span className="text-[11px] text-gray-300 uppercase tracking-wider font-mono font-semibold">
              Zawr Books Mobile
            </span>
          </div>
          <BrandLogo variant="square" className="h-5 w-auto opacity-80" />
        </div>
        <h1 className="text-base font-bold mt-1">Hello, {employee?.fullName || 'User'}</h1>
        <p className="text-xs text-gray-300 mt-0.5">
          {employee?.department || 'Operations'} • {storeState.organization?.legalName || storeState.organization?.name || 'Zawr Workspace'}
        </p>

        {/* Prominent Scan CTA Button */}
        <div className="mt-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setIsScannerOpen(true)}
            className="w-full bg-white text-black hover:bg-gray-100 font-bold py-2.5 text-xs flex items-center justify-center gap-2"
          >
            <Scan size={16} /> Scan Receipt with AI
          </Button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white border border-[#E5E5E5] p-2.5 text-center">
          <div className="text-lg font-bold text-[#111111]">{awaitingCount}</div>
          <div className="text-[10px] text-[#666666] uppercase mt-0.5 font-medium">Pending</div>
        </div>
        <div className="bg-white border border-[#E5E5E5] p-2.5 text-center">
          <div className="text-lg font-bold text-[#137333]">{approvedCount}</div>
          <div className="text-[10px] text-[#666666] uppercase mt-0.5 font-medium">Approved</div>
        </div>
        <div className="bg-white border border-[#E5E5E5] p-2.5 text-center">
          <div className="text-lg font-bold text-[#C5221F]">{rejectedCount}</div>
          <div className="text-[10px] text-[#666666] uppercase mt-0.5 font-medium">Returned</div>
        </div>
      </div>

      {/* Total Claim Amount Card */}
      <div className="bg-white border border-[#E5E5E5] p-3 flex justify-between items-center">
        <div>
          <div className="text-[10px] text-[#777777] uppercase font-medium">
            Total Submissions (Current Month)
          </div>
          <div className="text-base font-bold text-[#111111] mt-0.5">
            <CurrencyDisplay paise={totalPaise} />
          </div>
        </div>
        <Link
          href="/mobile/submissions"
          className="text-xs text-[#111111] font-semibold flex items-center gap-1 hover:underline"
        >
          View All <ArrowRight size={13} />
        </Link>
      </div>

      {/* Recent Submissions Feed */}
      <Card
        title="Recent Submissions"
        subtitle="Track live approval and reimbursement states"
        noPadding
      >
        <div className="divide-y divide-[#E5E5E5]">
          {myExpenses.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#777777]">
              No expenses submitted yet. Tap "Scan Receipt with AI" to upload your first bill.
            </div>
          ) : (
            myExpenses.slice(0, 5).map((exp) => (
              <div key={exp.id} className="p-3 hover:bg-[#FAFAF9] transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-[#111111]">{exp.vendorName}</div>
                    <div className="text-[11px] text-[#666666]">{exp.title}</div>
                    <div className="text-[10px] text-[#888888] font-mono mt-0.5">
                      {formatDate(exp.invoiceDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold num-tabular">
                      <CurrencyDisplay paise={exp.grandTotalPaise} />
                    </div>
                    <Badge status={exp.status} className="mt-1" />
                  </div>
                </div>

                {/* Approver Comments snippet */}
                {exp.comments && exp.comments.length > 0 && (
                  <div className="mt-2 p-1.5 bg-[#F4F3EF] border-l-2 border-[#111111] text-[10px] text-[#444444]">
                    <strong>{exp.comments[0].author}:</strong> {exp.comments[0].text}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </MobileLayout>
  );
}
