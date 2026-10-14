'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/common/TopBar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { globalDataStore } from '@/lib/store/dataStore';
import { Home, Scan, FileText, Bell, User, RefreshCw } from 'lucide-react';

export const MobileLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(globalDataStore.getLastSyncTimestamp());
  const [syncLabel, setSyncLabel] = useState('Synced just now');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
      setLastSyncTime(globalDataStore.getLastSyncTimestamp());
    });
    return unsubscribe;
  }, []);

  // Real-time relative timestamp update
  useEffect(() => {
    const updateLabel = () => {
      const diffSec = Math.floor((Date.now() - lastSyncTime) / 1000);
      if (diffSec < 5) {
        setSyncLabel('Synced just now');
      } else if (diffSec < 60) {
        setSyncLabel(`Synced ${diffSec}s ago`);
      } else {
        const mins = Math.floor(diffSec / 60);
        setSyncLabel(`Synced ${mins}m ago`);
      }
    };

    updateLabel();
    const interval = setInterval(updateLabel, 5000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const handleManualSync = () => {
    setIsSyncing(true);
    globalDataStore.syncNow();
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(Date.now());
    }, 400);
  };

  const employee = storeState.currentUser;
  const myExpenses = storeState.expenses.filter((e) => e.employeeId === employee.id);

  // Real-time alerts count (items returned for correction or rejected)
  const actionRequiredCount = myExpenses.filter(
    (e) => e.status === 'Returned' || e.status === 'Rejected'
  ).length;

  const navItems = [
    { label: 'Home', href: '/mobile', icon: Home },
    {
      label: 'Submissions',
      href: '/mobile/submissions',
      icon: FileText,
      badge: myExpenses.length > 0 ? myExpenses.length : undefined,
    },
    { label: 'Scan', href: '#scan', icon: Scan, isScanButton: true },
    {
      label: 'Alerts',
      href: '/mobile/notifications',
      icon: Bell,
      badge: actionRequiredCount > 0 ? actionRequiredCount : undefined,
      badgeColor: 'bg-[#C5221F] text-white',
    },
    { label: 'Profile', href: '/mobile/profile', icon: User },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F4F3EF] flex flex-col font-sans">
        <TopBar />

        {/* Real-time Status Banner */}
        <div className="w-full bg-[#EBF3EB] border-b border-[#C8E6C9] py-1 px-4 select-none">
          <div className="max-w-md mx-auto flex items-center justify-between text-[11px] text-[#1B5E20]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="font-semibold tracking-tight">Live Realtime Sync</span>
              <span className="text-[10px] text-[#2E7D32] opacity-80 font-mono">• {syncLabel}</span>
            </div>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1 text-[10px] font-semibold text-[#1B5E20] hover:text-black transition-colors"
              title="Force sync latest records"
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              <span className="hidden xs:inline">Sync</span>
            </button>
          </div>
        </div>

        {/* Responsive Content Canvas */}
        <div className="flex-1 w-full max-w-md mx-auto sm:my-4 sm:border sm:border-[#E5E5E5] sm:shadow-lg sm:rounded-xl overflow-hidden bg-[#F4F3EF] flex flex-col">
          <main className="flex-1 p-3.5 sm:p-4 space-y-4 pb-28 sm:pb-32">
            {children}
          </main>
        </div>

        {/* Mobile Fixed Bottom Navigation (PRD Section 4.2 - Safe Area Aware) */}
        <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E5E5E5] z-50 shadow-md">
          <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
            {navItems.map((item, idx) => {
              if (item.isScanButton) {
                return (
                  <button
                    key={idx}
                    onClick={() => setIsScannerOpen(true)}
                    className="flex flex-col items-center justify-center -mt-6 bg-[#111111] text-white w-13 h-13 border-2 border-white shadow-xl rounded-full active:scale-95 transition-transform hover:bg-black focus:outline-none"
                    title="Scan Receipt with AI"
                  >
                    <Scan size={22} className="stroke-[2.2]" />
                    <span className="text-[8px] font-extrabold tracking-widest mt-0.5 uppercase">
                      SCAN
                    </span>
                  </button>
                );
              }

              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={idx}
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center w-14 h-full text-[10px] transition-colors ${
                    isActive ? 'text-[#111111] font-bold' : 'text-[#777777] hover:text-[#111111]'
                  }`}
                >
                  <div className="relative">
                    <Icon size={19} className={isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
                    {item.badge !== undefined && (
                      <span
                        className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center border border-white ${
                          item.badgeColor || 'bg-[#111111] text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="mt-1 tracking-tight text-[10px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Global Scanner Modal */}
        <ReceiptScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
        />
      </div>
    </AuthGuard>
  );
};
