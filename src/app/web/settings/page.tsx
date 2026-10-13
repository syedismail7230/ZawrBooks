'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { globalDataStore } from '@/lib/store/dataStore';
import { Sliders, Lock, Save } from 'lucide-react';

export default function SettingsPage() {
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [lockedDate, setLockedDate] = useState(storeState.organization?.periodLockedUntil || '');
  const [currency, setCurrency] = useState(storeState.organization?.currency || 'INR');
  const [timezone, setTimezone] = useState(storeState.organization?.timezone || 'Asia/Kolkata');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return globalDataStore.subscribe(() => {
      const s = globalDataStore.getState();
      setStoreState({ ...s });
      if (s.organization) {
        if (s.organization.periodLockedUntil) setLockedDate(s.organization.periodLockedUntil);
        if (s.organization.currency) setCurrency(s.organization.currency);
        if (s.organization.timezone) setTimezone(s.organization.timezone);
      }
    });
  }, []);

  const handleSave = () => {
    if (storeState.organization) {
      globalDataStore.setOrganization({
        name: storeState.organization.name,
        legalName: storeState.organization.legalName,
        gstin: storeState.organization.gstin,
        pan: storeState.organization.pan,
        periodLockedUntil: lockedDate,
        currency,
        timezone,
      });
    } else {
      globalDataStore.setOrganization({
        name: 'My Organization',
        legalName: 'My Organization',
        pan: '',
        gstin: '',
        currency,
        timezone,
        periodLockedUntil: lockedDate,
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <WebLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-base font-bold text-[#111111] uppercase tracking-wider">
            Financial & Accounting Settings
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Configure fiscal period locking, base currency, and accounting policies
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleSave}>
          <Save size={13} /> Save Settings
        </Button>
      </div>

      {saved && (
        <div className="p-3 bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] text-xs font-semibold">
          Financial settings updated successfully!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Accounting Period Locking">
          <div className="space-y-3 text-xs">
            <p className="text-[#666666]">
              Enforce period-closing immutability. No journal entries, invoices, or adjustments can be posted with dates prior to or on the lock date.
            </p>
            <div>
              <label className="block text-[11px] font-medium text-[#444444] mb-1">
                Lock All Financial Entries Up To:
              </label>
              <input
                type="date"
                value={lockedDate}
                onChange={(e) => setLockedDate(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-mono"
              />
            </div>
            <div className="p-2.5 bg-[#FEF7E0] border border-[#FEEFC3] text-[#B25900] text-[11px] flex items-center gap-2">
              <Lock size={14} className="shrink-0" />
              <span>Prior periods up to {lockedDate} are locked against mutations.</span>
            </div>
          </div>
        </Card>

        <Card title="Localization & Currency System">
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-[#444444] mb-1">
                Base Accounting Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-medium"
              >
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#444444] mb-1">
                Organization Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-white border border-[#CCCCCC] p-2 text-xs outline-none focus:border-black font-medium"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+05:30)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </Card>
      </div>
    </WebLayout>
  );
}
