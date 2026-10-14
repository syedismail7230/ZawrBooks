'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/common/TopBar';
import { BrandLogo } from '@/components/common/BrandLogo';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { globalDataStore } from '@/lib/store/dataStore';
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  FileText,
  Users,
  Briefcase,
  Landmark,
  ListTree,
  BookOpen,
  Scale,
  BarChart3,
  Percent,
  CheckSquare,
  FolderLock,
  PieChart,
  CalendarClock,
  History,
  Sliders,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  requiredPermission?: string;
  badge?: number;
}

export const WebLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const store = globalDataStore.getState();

  // Automatically close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  // Compute pending approvals count (both expenses and vendor bills)
  const pendingApprovalsCount =
    (store.expenses?.filter((e) => e.status === 'Submitted' || e.status === 'Under Review').length || 0) +
    (store.vendorBills?.filter((b) => b.status === 'Submitted' || b.status === 'Draft').length || 0);

  const navItems: NavItem[] = [
    { name: 'Overview', href: '/web', icon: LayoutDashboard },
    { name: 'Transactions', href: '/web/transactions', icon: Receipt },
    { name: 'Expenses & Bills', href: '/web/expenses', icon: FileSpreadsheet },
    { name: 'Sales & Invoices', href: '/web/invoices', icon: FileText },
    { name: 'Customers', href: '/web/customers', icon: Users },
    { name: 'Vendors', href: '/web/vendors', icon: Briefcase },
    { name: 'Banking', href: '/web/banking', icon: Landmark },
    { name: 'Chart of Accounts', href: '/web/accounts', icon: ListTree },
    { name: 'General Ledger', href: '/web/general-ledger', icon: BookOpen },
    { name: 'Journal Entries', href: '/web/journals', icon: Scale },
    { name: 'Accounting Reports', href: '/web/reports', icon: BarChart3 },
    { name: 'GST & Tax', href: '/web/gst', icon: Percent },
    { name: 'Approvals', href: '/web/approvals', icon: CheckSquare, badge: pendingApprovalsCount },
    { name: 'Documents', href: '/web/documents', icon: FolderLock },
    { name: 'Budgets & Projects', href: '/web/budgets', icon: PieChart },
    { name: 'Scheduled Reports', href: '/web/scheduled-reports', icon: CalendarClock },
    { name: 'Audit Trail', href: '/web/audit-trail', icon: History },
    { name: 'Settings', href: '/web/settings', icon: Sliders },
  ];

  // Current active navigation item
  const currentNavItem = navItems.find((item) =>
    item.href === '/web' ? pathname === '/web' : pathname.startsWith(item.href)
  ) || navItems[0];
  const CurrentIcon = currentNavItem.icon;

  // Quick navigation items for mobile horizontal bar
  const quickPillItems = [
    { name: 'Overview', href: '/web' },
    { name: 'Expenses', href: '/web/expenses' },
    { name: 'Invoices', href: '/web/invoices' },
    { name: 'Banking', href: '/web/banking' },
    { name: 'Journals', href: '/web/journals' },
    { name: 'Reports', href: '/web/reports' },
    { name: 'Approvals', href: '/web/approvals', badge: pendingApprovalsCount },
    { name: 'Settings', href: '/web/settings' },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F4F3EF] flex flex-col font-sans">
        <TopBar />

        {/* Mobile Navigation Sub-Header (Visible on screens < lg) */}
        <div className="lg:hidden sticky top-12 z-30 bg-white border-b border-[#E5E5E5] shadow-2xs">
          <div className="px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-[#111111] text-white flex items-center justify-center shrink-0">
                <CurrentIcon size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#111111] truncate leading-tight">
                  {currentNavItem.name}
                </div>
                <div className="text-[10px] text-[#777777] font-mono leading-tight">
                  Finance Workspace
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {pendingApprovalsCount > 0 && (
                <Link
                  href="/web/approvals"
                  className="px-2 py-0.5 bg-[#FEF7E0] border border-[#FEEFC3] text-[#B25900] text-[10px] font-mono font-bold flex items-center gap-1 rounded-xs"
                >
                  <span>{pendingApprovalsCount} Approvals</span>
                </Link>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="px-2.5 py-1.5 bg-[#F4F3EF] hover:bg-[#EAE8E2] border border-[#CCCCCC] text-[#111111] text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X size={14} /> : <Menu size={14} />}
                <span>{isMobileMenuOpen ? 'Close' : 'Menu'}</span>
              </button>
            </div>
          </div>

          {/* Quick-Access Scrollable Pills for Common Sections */}
          <div className="px-3 pb-2 pt-0.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap border-t border-[#F0EFEA]">
            {quickPillItems.map((pill) => {
              const isActive =
                pill.href === '/web' ? pathname === '/web' : pathname.startsWith(pill.href);
              return (
                <Link
                  key={pill.href}
                  href={pill.href}
                  className={`px-2.5 py-1 text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1 ${
                    isActive
                      ? 'bg-[#111111] text-white font-semibold'
                      : 'bg-[#F4F3EF] text-[#555555] hover:text-[#111111] hover:bg-[#EAE8E2] border border-[#E5E5E5]'
                  }`}
                >
                  <span>{pill.name}</span>
                  {pill.badge !== undefined && pill.badge > 0 && (
                    <span className="px-1 py-0.2 bg-[#FEF7E0] text-[#B25900] text-[9px] font-bold rounded-xs">
                      {pill.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile Slide-Over Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Slide-out Menu Panel */}
            <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-[#111111] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250">
              {/* Drawer Header */}
              <div className="p-3.5 border-b border-[#E5E5E5] bg-[#F4F3EF] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrandLogo variant="icon" className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Finance Navigation
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-[#666666] hover:text-black hover:bg-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Navigation List */}
              <nav className="flex-1 py-2 overflow-y-auto divide-y divide-[#F5F5F3]">
                {navItems.map((item) => {
                  const isActive =
                    item.href === '/web'
                      ? pathname === '/web'
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'border-l-4 border-[#111111] bg-[#F4F3EF] text-[#111111] font-bold'
                          : 'border-l-4 border-transparent text-[#555555] hover:text-[#111111] hover:bg-[#FAFAF9]'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon size={15} className={isActive ? 'text-[#111111]' : 'text-[#777777]'} />
                        <span className="truncate">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="px-1.5 py-0.5 bg-[#FEF7E0] text-[#B25900] border border-[#FEEFC3] text-[10px] font-mono font-bold">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight size={13} className="text-[#AAAAAA]" />
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Drawer Footer */}
              <div className="p-3.5 border-t border-[#E5E5E5] bg-[#FFFFFF] flex items-center justify-between text-[11px] text-[#777777]">
                <div>
                  <div className="font-mono font-bold text-[#111111]">Zawr Engine v1.0</div>
                  <div className="text-[10px]">FY 2026-27 (Locked)</div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-2 py-1 text-xs text-[#555555] hover:text-black border border-[#E5E5E5]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1">
          {/* Desktop Persistent Sidebar (Zerodha style: dense, clean, restrained) */}
          <aside className="hidden lg:flex w-56 bg-white border-r border-[#E5E5E5] flex-col shrink-0">
            <div className="p-3 border-b border-[#F0EFEA] text-[10px] font-bold uppercase tracking-wider text-[#777777]">
              Finance Navigation
            </div>

            <nav className="flex-1 py-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/web'
                    ? pathname === '/web'
                    : pathname.startsWith(item.href);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-medium border-l-2 transition-colors ${
                      isActive
                        ? 'border-[#111111] bg-[#F4F3EF] text-[#111111] font-semibold'
                        : 'border-transparent text-[#555555] hover:text-[#111111] hover:bg-[#FAFAF9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon size={14} className={isActive ? 'text-[#111111]' : 'text-[#777777]'} />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 bg-[#FEF7E0] text-[#B25900] border border-[#FEEFC3] text-[10px] font-mono">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#E5E5E5] bg-[#FFFFFF] flex items-center gap-2.5">
              <BrandLogo variant="icon" className="w-5 h-5 shrink-0" />
              <div className="text-[10px] text-[#888888] leading-tight">
                <div className="font-mono font-medium text-[#333333]">Zawr Engine v1.0</div>
                <div>FY 2026-27 (Locked: 31-Mar-26)</div>
              </div>
            </div>
          </aside>

          {/* Main Content Workspace */}
          <main className="flex-1 overflow-x-hidden p-3.5 sm:p-5">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};
