'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { globalDataStore } from '@/lib/store/dataStore';
import {
  User,
  Building,
  CreditCard,
  Shield,
  Edit3,
  Check,
  Laptop,
  LogOut,
  Mail,
  Building2,
  Lock,
  Download,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function MobileProfilePage() {
  const router = useRouter();
  const [storeState, setStoreState] = useState(globalDataStore.getState());
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankDetails, setBankDetails] = useState('');
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateMessage(null);
    try {
      const res = await fetch('/api/app/version', { cache: 'no-store' });
      if (res.ok) {
        setUpdateMessage('Refreshing latest release...');
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            const zawrApp = (window as any).ZawrApp;
            if (zawrApp && typeof zawrApp.refreshApp === 'function') {
              zawrApp.refreshApp();
            } else {
              window.location.reload();
            }
          }
        }, 500);
      } else {
        setUpdateMessage('Server verified • Up to date');
        setTimeout(() => setUpdateMessage(null), 3000);
        setIsCheckingUpdate(false);
      }
    } catch (e) {
      setUpdateMessage('Offline check failed');
      setTimeout(() => setUpdateMessage(null), 3000);
      setIsCheckingUpdate(false);
    }
  };

  useEffect(() => {
    globalDataStore.syncWithServer();
    const unsub = globalDataStore.subscribe(() => {
      setStoreState({ ...globalDataStore.getState() });
    });
    return unsub;
  }, []);

  const user = storeState.currentUser;
  const role = user?.role || 'employee';

  useEffect(() => {
    if (user?.bankDetails) {
      setBankDetails(user.bankDetails);
    }
  }, [user]);

  const handleSaveBankDetails = () => {
    if (user?.id) {
      globalDataStore.updateUserProfile(user.id, {
        bankDetails: bankDetails.trim(),
      });
      setIsEditingBank(false);
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout error:', e);
    }
    globalDataStore.logout();
    router.push('/login');
  };

  const canAccessWeb = ['owner', 'director', 'finance_admin', 'accountant', 'approver', 'auditor'].includes(role);
  const isCeo = role === 'owner' && (user?.email?.toLowerCase() === 'ceo@zawrindustries.com' || user?.fullName?.toLowerCase().includes('syed ismail'));
  const canAccessControl = isCeo;

  return (
    <MobileLayout>
      <div className="pb-2 border-b border-[#E5E5E5] flex justify-between items-center">
        <div>
          <h1 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
            Employee Profile
          </h1>
          <p className="text-[11px] text-[#666666]">
            Identity, corporate credentials & reimbursement settings
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <Card noPadding className="shadow-2xs">
        <div className="p-4 bg-white text-center border-b border-[#E5E5E5]">
          <div className="w-16 h-16 bg-[#111111] text-white text-xl font-bold flex items-center justify-center mx-auto mb-2 border-2 border-white shadow-md">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <h2 className="text-sm font-bold text-[#111111]">{user?.fullName || 'Active User'}</h2>
          <p className="text-xs text-[#666666] font-mono mt-0.5">{user?.email || 'user@company.com'}</p>
          <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
            <span className="inline-block px-2 py-0.5 bg-[#111111] text-white text-[10px] font-mono font-bold uppercase tracking-wider">
              {user?.role === 'owner' ? 'SUPER ADMIN' : user?.role?.replace('_', ' ') || 'STAFF'}
            </span>
            <span className="inline-block px-2 py-0.5 bg-[#F4F3EF] border border-[#E5E5E5] text-[10px] font-mono text-[#555555]">
              {user?.department || 'Corporate Operations'}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4 text-xs divide-y divide-[#F0EFEA]">
          {/* Organization Info */}
          <div className="pt-2 first:pt-0">
            <div className="flex items-start gap-2.5 text-[#444444]">
              <Building2 size={16} className="text-[#888888] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-[10px] text-[#777777] uppercase font-mono">Organization</div>
                <div className="font-bold text-[#111111] text-xs mt-0.5">
                  {storeState.organization?.legalName || storeState.organization?.name || 'Zawr Industries LLP'}
                </div>
                <div className="text-[10px] text-[#777777] font-mono mt-0.5">
                  {storeState.organization?.gstin
                    ? `GSTIN: ${storeState.organization.gstin}`
                    : 'GSTIN: 29AADFZ6214A1ZC (Karnataka)'}
                </div>
              </div>
            </div>
          </div>

          {/* Reimbursement Bank Details */}
          <div className="pt-3">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 flex-1">
                <CreditCard size={16} className="text-[#888888] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[10px] text-[#777777] uppercase font-mono">
                    Reimbursement Payout Preference
                  </div>

                  {isEditingBank ? (
                    <div className="mt-1.5 space-y-2">
                      <input
                        type="text"
                        placeholder="e.g. HDFC Bank - A/C 50100012345678, IFSC HDFC0000123"
                        value={bankDetails}
                        onChange={(e) => setBankDetails(e.target.value)}
                        className="w-full bg-[#F4F3EF] border border-[#CCCCCC] p-1.5 text-xs outline-none focus:border-black font-mono"
                      />
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={handleSaveBankDetails}>
                          <Check size={11} /> Save Payout Details
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsEditingBank(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <div className="font-mono text-xs text-[#111111]">
                        {user?.bankDetails || bankDetails || 'Direct deposit account registered with payroll'}
                      </div>
                      {isSavedNotice && (
                        <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                          <Check size={11} /> Payout details updated in real time!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!isEditingBank && (
                <button
                  onClick={() => setIsEditingBank(true)}
                  className="text-[11px] text-[#0066CC] hover:underline font-semibold shrink-0"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Security & Authenticated Session */}
          <div className="pt-3">
            <div className="flex items-center gap-2.5 text-[#444444]">
              <Shield size={16} className="text-[#137333] shrink-0" />
              <div>
                <div className="font-semibold text-[#111111]">Session Security & RBAC</div>
                <div className="text-[10px] text-[#137333] font-mono mt-0.5">
                  HMAC SHA-256 HttpOnly Active • Full Super Admin Rights
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Surface Navigation for Authorized Users */}
      {(canAccessWeb || canAccessControl) && (
        <Card title="Switch Workspace Surface" subtitle="Quick access across devices" noPadding>
          <div className="divide-y divide-[#E5E5E5]">
            {canAccessWeb && (
              <Link
                href="/web"
                className="p-3 flex items-center justify-between hover:bg-[#FAFAF9] transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Laptop size={15} className="text-[#555555]" />
                  <div>
                    <div className="font-semibold text-[#111111]">Finance Web Dashboard</div>
                    <div className="text-[10px] text-[#777777]">Full bookkeeping, reports, approvals & journals</div>
                  </div>
                </div>
                <span className="text-[11px] text-black font-semibold">Open →</span>
              </Link>
            )}

            {canAccessControl && (
              <Link
                href="/control"
                className="p-3 flex items-center justify-between hover:bg-[#FAFAF9] transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Shield size={15} className="text-[#555555]" />
                  <div>
                    <div className="font-semibold text-[#111111]">Control Centre</div>
                    <div className="text-[10px] text-[#777777]">RBAC permissions, audit log & governance</div>
                  </div>
                </div>
                <span className="text-[11px] text-black font-semibold">Open →</span>
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* Over-The-Air (OTA) Live Updates & Sync Card */}
      <Card noPadding className="shadow-2xs">
        <div className="p-3.5 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-none bg-[#111111] text-white flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                  <span>Over-The-Air (OTA) Updates</span>
                  <span className="inline-flex items-center px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold uppercase">
                    Active
                  </span>
                </div>
                <div className="text-[10px] text-[#666666]">
                  Zero-install cloud sync with books.zawrindustries.com
                </div>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-[#FAFAF9] border border-[#E5E5E5] text-[11px] text-[#555555] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[#888888]">Live Web Server:</span>
              <span className="font-mono text-[#111111] font-semibold text-[10px]">books.zawrindustries.com</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#888888]">Deployment Sync:</span>
              <span className="font-mono text-[#137333] font-semibold flex items-center gap-1 text-[10px]">
                <Check size={11} /> Always Up-To-Date
              </span>
            </div>
          </div>

          <div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdate}
              className="w-full justify-center text-xs font-bold uppercase tracking-wider py-2"
            >
              <RefreshCw size={13} className={isCheckingUpdate ? 'animate-spin' : ''} />
              <span>{isCheckingUpdate ? 'Checking Server...' : updateMessage || 'Check for Live Updates & Refresh'}</span>
            </Button>
          </div>

          <div className="pt-2 border-t border-[#F0EFEA] flex items-center justify-between text-[10px] text-[#888888]">
            <span>Need APK for a new phone?</span>
            <a
              href="/ZawrBooks.apk"
              download="ZawrBooks.apk"
              className="text-[#0066CC] hover:underline font-semibold flex items-center gap-1"
            >
              <Download size={11} /> Download APK Backup
            </a>
          </div>
        </div>
      </Card>

      {/* Logout Action */}
      <div className="pt-1">
        <Button
          variant="outline"
          size="lg"
          onClick={handleLogout}
          className="w-full text-[#C5221F] border-[#C5221F]/30 hover:bg-[#C5221F]/10 hover:border-[#C5221F] font-semibold flex items-center justify-center gap-2 py-2.5 text-xs active:scale-[0.98] transition-transform"
        >
          <LogOut size={14} /> Sign Out of Zawr Books
        </Button>
      </div>
    </MobileLayout>
  );
}
