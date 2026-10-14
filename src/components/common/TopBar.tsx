'use client';

import React, { useState } from 'react';
import { globalDataStore } from '@/lib/store/dataStore';
import { Button } from '@/components/common/Button';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { BalancedJournalModal } from '@/components/finance/BalancedJournalModal';
import {
  Building2,
  Scan,
  Plus,
  Shield,
  Smartphone,
  Laptop,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const TopBar: React.FC = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    setStoreState({ ...globalDataStore.getState() });
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const currentUser = storeState.currentUser;

  const handleSwitchUser = (userId: string) => {
    globalDataStore.switchUser(userId);
    setUserDropdownOpen(false);
  };

  const isWeb = pathname.startsWith('/web') || pathname === '/';
  const isMobile = pathname.startsWith('/mobile');
  const isControl = pathname.startsWith('/control');

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-[#E5E5E5]">
        {/* Upper Brand & Switcher Bar */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-[#F0EFEA] bg-[#FFFFFF]">
          <div className="flex items-center gap-6">
            <Link href="/web" className="flex items-center text-decoration-none group select-none py-0.5">
              <BrandLogo variant="reactive" className="transition-transform group-hover:scale-[1.02]" />
            </Link>

            {/* Organization Tag */}
            <div className="hidden md:flex items-center gap-2 text-[11px] text-[#666666] border-l border-[#E5E5E5] pl-4">
              <Building2 size={13} className="text-[#888888]" />
              <span className="font-medium text-[#111111]" suppressHydrationWarning>
                {mounted
                  ? storeState.organization?.legalName || storeState.organization?.name || 'Organization Not Configured'
                  : 'Organization Not Configured'}
              </span>
              {mounted && storeState.organization?.gstin && (
                <span className="text-[#999999] font-mono">GSTIN: {storeState.organization.gstin}</span>
              )}
            </div>
          </div>

          {/* Three Interconnected Surfaces Navigation */}
          <div className="flex items-center gap-1 bg-[#F4F3EF] p-0.5 border border-[#E5E5E5]">
            <Link
              href="/web"
              className={`px-3 py-1 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isWeb
                  ? 'bg-white text-[#111111] shadow-none border border-[#E5E5E5]'
                  : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              <Laptop size={13} />
              <span className="hidden sm:inline">Finance Web</span>
            </Link>

            <Link
              href="/mobile"
              className={`px-3 py-1 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isMobile
                  ? 'bg-white text-[#111111] shadow-none border border-[#E5E5E5]'
                  : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              <Smartphone size={13} />
              <span className="hidden sm:inline">Mobile PWA</span>
            </Link>

            <Link
              href="/control"
              className={`px-3 py-1 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isControl
                  ? 'bg-white text-[#111111] shadow-none border border-[#E5E5E5]'
                  : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              <Shield size={13} />
              <span className="hidden sm:inline">Control Centre</span>
            </Link>
          </div>

          {/* Right Action & RBAC Switcher */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScannerOpen(true)}
              className="hidden lg:flex"
            >
              <Scan size={13} /> AI Scan
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsJournalOpen(true)}
              className="hidden lg:flex"
            >
              <Plus size={13} /> Journal
            </Button>

            {/* Interactive User & Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1 border border-[#E5E5E5] hover:border-black bg-[#F4F3EF] text-left text-xs transition-colors"
                suppressHydrationWarning
              >
                <div className="w-5 h-5 bg-[#111111] text-white flex items-center justify-center text-[10px] font-bold" suppressHydrationWarning>
                  {currentUser.fullName.charAt(0)}
                </div>
                <div className="hidden sm:block" suppressHydrationWarning>
                  <div className="text-[11px] font-bold leading-none text-[#111111]" suppressHydrationWarning>
                    {currentUser.fullName}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-[#666666] mt-0.5" suppressHydrationWarning>
                    {currentUser.role.replace('_', ' ')}
                  </div>
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white border border-[#111111] shadow-xl z-50 p-1">
                  <div className="px-2.5 py-1.5 border-b border-[#E5E5E5] text-[10px] uppercase font-bold text-[#666666]">
                    Switch Role for Evaluation
                  </div>
                  <div className="py-1">
                    {storeState.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSwitchUser(u.id)}
                        className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between text-xs hover:bg-[#F4F3EF] transition-colors ${
                          u.id === currentUser.id ? 'bg-[#F4F3EF] font-bold text-black' : 'text-[#444444]'
                        }`}
                      >
                        <div>
                          <div className="text-xs">{u.fullName}</div>
                          <div className="text-[10px] text-[#777777] uppercase font-mono">
                            {u.role.replace('_', ' ')} • {u.department}
                          </div>
                        </div>
                        {u.id === currentUser.id && <Check size={14} className="text-black" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Modals accessible from any surface */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
      <BalancedJournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
      />
    </>
  );
};
