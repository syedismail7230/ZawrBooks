'use client';

import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { globalDataStore } from '@/lib/store/dataStore';
import { User, Building, CreditCard, Shield, Edit3, Check } from 'lucide-react';

export default function MobileProfilePage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankDetails, setBankDetails] = useState('');

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const user = storeState.currentUser;

  return (
    <MobileLayout>
      <div className="pb-2 border-b border-[#E5E5E5]">
        <h1 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
          Employee Profile
        </h1>
        <p className="text-[11px] text-[#666666]">
          Identity details and reimbursement bank preferences
        </p>
      </div>

      <Card noPadding>
        <div className="p-4 bg-white text-center border-b border-[#E5E5E5]">
          <div className="w-14 h-14 bg-[#111111] text-white text-lg font-bold flex items-center justify-center mx-auto mb-2">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <h2 className="text-sm font-bold text-[#111111]">{user?.fullName || 'Active User'}</h2>
          <p className="text-xs text-[#666666]">{user?.email || 'user@company.com'}</p>
          <span className="inline-block mt-2 px-2 py-0.5 bg-[#F4F3EF] border border-[#E5E5E5] text-[10px] font-mono uppercase tracking-wider">
            {user?.role?.replace('_', ' ') || 'Staff'} • {user?.department || 'Operations'}
          </span>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#444444]">
            <Building size={15} className="text-[#888888] shrink-0" />
            <div>
              <div className="font-semibold text-[#111111]">
                {storeState.organization?.legalName || storeState.organization?.name || 'Organization Pending Configuration'}
              </div>
              <div className="text-[10px] text-[#777777] font-mono">
                {storeState.organization?.gstin ? `GSTIN: ${storeState.organization.gstin}` : 'GSTIN: Not Configured'}
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-2.5 text-[#444444]">
            <div className="flex items-center gap-2.5">
              <CreditCard size={15} className="text-[#888888] shrink-0" />
              <div>
                <div className="font-semibold text-[#111111]">Reimbursement Payout Preference</div>
                {isEditingBank ? (
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Bank Name - A/C 1234567890"
                      value={bankDetails}
                      onChange={(e) => setBankDetails(e.target.value)}
                      className="bg-[#F4F3EF] border border-[#CCCCCC] px-2 py-0.5 text-xs outline-none focus:border-black font-mono"
                    />
                    <Button variant="primary" size="sm" onClick={() => setIsEditingBank(false)}>
                      <Check size={11} /> Save
                    </Button>
                  </div>
                ) : (
                  <div className="text-[10px] text-[#777777] font-mono">
                    {bankDetails || 'Direct deposit linked to employee profile'}
                  </div>
                )}
              </div>
            </div>
            {!isEditingBank && (
              <button
                onClick={() => setIsEditingBank(true)}
                className="text-[10px] text-[#0066CC] hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-[#444444]">
            <Shield size={15} className="text-[#888888] shrink-0" />
            <div>
              <div className="font-semibold text-[#111111]">Security & Verification</div>
              <div className="text-[10px] text-[#137333]">Supabase Auth Active • Live Session</div>
            </div>
          </div>
        </div>
      </Card>
    </MobileLayout>
  );
}
