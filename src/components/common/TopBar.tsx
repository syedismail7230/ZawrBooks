'use client';

import React, { useState } from 'react';
import { globalDataStore } from '@/lib/store/dataStore';
import { Button } from '@/components/common/Button';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { BalancedJournalModal } from '@/components/finance/BalancedJournalModal';
import { SetPasswordModal } from '@/components/auth/SetPasswordModal';
import {
  Building2,
  Scan,
  Plus,
  Shield,
  Smartphone,
  Laptop,
  LogOut,
  KeyRound,
  LogIn,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export const TopBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    setStoreState({ ...globalDataStore.getState() });
    return globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
  }, []);

  const currentUser = storeState.currentUser;
  const isAuthenticated = storeState.isAuthenticated;
  const role = currentUser?.role || 'employee';

  const isWeb = pathname.startsWith('/web') || pathname === '/';
  const isMobile = pathname.startsWith('/mobile');
  const isControl = pathname.startsWith('/control');

  // RBAC Permission checks for surface switcher
  const isCeo = currentUser?.role === 'owner' && (currentUser?.email?.toLowerCase() === 'ceo@zawrindustries.com' || currentUser?.fullName?.toLowerCase().includes('syed ismail'));
  const canAccessWeb = ['owner', 'director', 'finance_admin', 'accountant', 'approver', 'auditor'].includes(role);
  const canAccessControl = isCeo; // Control Centre is strictly CEO only

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API error:', e);
    }
    globalDataStore.logout();
    setUserDropdownOpen(false);
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-[#E5E5E5]">
        {/* Upper Brand & Surface Switcher Bar */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-[#F0EFEA] bg-[#FFFFFF]">
          <div className="flex items-center gap-6">
            <Link href="/web" className="flex items-center text-decoration-none group select-none py-0.5">
              <BrandLogo variant="reactive" className="transition-transform group-hover:scale-[1.02]" />
            </Link>

            {/* Organization Tag */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-[#666666] border-l border-[#E5E5E5] pl-4">
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

          {/* CEO-Only Workspace Switcher: Finance Web & Control Centre (Mobile app is a separate standalone APK) */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1 bg-[#F4F3EF] p-0.5 border border-[#E5E5E5]">
              {canAccessWeb && (
                <Link
                  href="/web"
                  className={`px-3 py-1 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    isWeb
                      ? 'bg-white text-[#111111] shadow-none border border-[#E5E5E5]'
                      : 'text-[#666666] hover:text-[#111111]'
                  }`}
                >
                  <Laptop size={13} />
                  <span>Finance Web</span>
                </Link>
              )}

              {canAccessControl && (
                <Link
                  href="/control"
                  className={`px-3 py-1 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    isControl
                      ? 'bg-white text-[#111111] shadow-none border border-[#E5E5E5]'
                      : 'text-[#666666] hover:text-[#111111]'
                  }`}
                  title="CEO Governance & RBAC Control Centre"
                >
                  <Shield size={13} />
                  <span>Control Centre</span>
                </Link>
              )}
            </div>
          )}

          {/* Right Action, Realtime Indicator & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime Live Pulse Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#EDF7ED] border border-[#C8E6C9] text-[10px] text-[#1B5E20] font-mono select-none rounded-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold tracking-tight">LIVE</span>
            </div>
            {isAuthenticated && (
              <>
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
              </>
            )}

            {/* Authenticated Profile or Login Button */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1 border border-[#E5E5E5] hover:border-black bg-[#F4F3EF] text-left text-xs transition-colors"
                  suppressHydrationWarning
                >
                  <div
                    className="w-5 h-5 bg-[#111111] text-white flex items-center justify-center text-[10px] font-bold"
                    suppressHydrationWarning
                  >
                    {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
                  </div>
                  <div className="hidden sm:block" suppressHydrationWarning>
                    <div className="text-[11px] font-bold leading-none text-[#111111]" suppressHydrationWarning>
                      {currentUser.fullName}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-[#666666] mt-0.5 font-mono" suppressHydrationWarning>
                      {currentUser.role.replace('_', ' ')}
                    </div>
                  </div>
                  <ChevronDown size={12} className="text-[#888888]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-[#111111] shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-2 border-b border-[#E5E5E5]">
                      <div className="text-xs font-bold text-[#111111]">{currentUser.fullName}</div>
                      <div className="text-[11px] text-[#666666] font-mono truncate">{currentUser.email}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0.5 bg-[#F4F3EF] border border-[#E5E5E5] text-[9px] uppercase font-bold text-[#111111]">
                          {currentUser.role.replace('_', ' ')}
                        </span>
                        {currentUser.department && (
                          <span className="text-[10px] text-[#888888] font-mono">
                            {currentUser.department}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setIsPasswordModalOpen(true);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-[#333333] hover:bg-[#F4F3EF] hover:text-black flex items-center gap-2 transition-colors"
                      >
                        <KeyRound size={13} className="text-[#666666]" />
                        <span>Set / Change Password</span>
                      </button>

                      {canAccessControl && (
                        <Link
                          href="/control/users"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full text-left px-2 py-1.5 text-xs text-[#333333] hover:bg-[#F4F3EF] hover:text-black flex items-center gap-2 transition-colors"
                        >
                          <ShieldCheck size={13} className="text-[#666666]" />
                          <span>RBAC User Management</span>
                        </Link>
                      )}



                      <div className="my-1 border-t border-[#E5E5E5]" />

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                      >
                        <LogOut size={13} />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button variant="primary" size="sm">
                  <LogIn size={13} /> Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Global Modals */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
      <BalancedJournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
      />
      <SetPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};
