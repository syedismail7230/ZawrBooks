'use client';

import React, { useState, useEffect } from 'react';
import { WebLayout } from '@/components/web/WebLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { globalDataStore } from '@/lib/store/dataStore';
import { Sliders, Lock, Save, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
            System & Mobile Settings
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Configure fiscal accounting period locking, currency, and download the native mobile app
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
        {/* Mobile Application APK Download Card */}
        <Card
          title="Zawr Books Mobile App (Android APK)"
          subtitle="Standalone native mobile application with AI receipt capture & real-time sync"
          className="md:col-span-2 shadow-2xs"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-1">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#E5E5E5] p-2 shadow-sm flex items-center justify-center shrink-0">
                <img
                  src="/favicon.png"
                  alt="Zawr Books App Icon"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-[#111111]">Zawr Books for Android</h3>
                  <span className="px-2 py-0.5 bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] text-[10px] font-mono font-bold rounded-xs">
                    v1.0.0 Stable APK
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#F4F3EF] border border-[#E5E5E5] text-[#666666] text-[10px] font-mono rounded-xs">
                    Signed Release Build
                  </span>
                </div>
                <p className="text-xs text-[#555555] max-w-xl">
                  Standalone production Android application built specifically for corporate expense scanning, camera receipt capture, and real-time ledger synchronization. Access via private direct link without public search engine listing.
                </p>
                <div className="pt-1 flex items-center gap-3 text-[11px] text-[#777777] font-mono flex-wrap">
                  <span>Package: com.zawrindustries.zawrbooks</span>
                  <span>•</span>
                  <span>Arch: Universal</span>
                  <span>•</span>
                  <span>Size: ~97 KB</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              <a
                href="/ZawrBooks.apk"
                download="ZawrBooks.apk"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-md active:scale-95 text-center rounded-xs"
              >
                <Download size={15} />
                <span>Download Android APK</span>
              </a>
            </div>
          </div>

          {/* Quick Installation Instructions */}
          <div className="mt-4 pt-4 border-t border-[#F0EFEA] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#F4F3EF] border border-[#E5E5E5]">
              <div className="font-bold text-[#111111] mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 bg-[#111111] text-white rounded-full flex items-center justify-center text-[10px]">1</span>
                <span>Download APK File</span>
              </div>
              <p className="text-[11px] text-[#666666]">
                Click "Download Android APK" above to save the signed <code>ZawrBooks.apk</code> to your device.
              </p>
            </div>
            <div className="p-3 bg-[#F4F3EF] border border-[#E5E5E5]">
              <div className="font-bold text-[#111111] mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 bg-[#111111] text-white rounded-full flex items-center justify-center text-[10px]">2</span>
                <span>Enable Installation</span>
              </div>
              <p className="text-[11px] text-[#666666]">
                When prompted by Android Package Installer, allow "Install from this source".
              </p>
            </div>
            <div className="p-3 bg-[#F4F3EF] border border-[#E5E5E5]">
              <div className="font-bold text-[#111111] mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 bg-[#111111] text-white rounded-full flex items-center justify-center text-[10px]">3</span>
                <span>Launch & Scan</span>
              </div>
              <p className="text-[11px] text-[#666666]">
                Open Zawr Books from your Android launcher for native camera scanning and instant expense syncing.
              </p>
            </div>
          </div>
        </Card>

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
