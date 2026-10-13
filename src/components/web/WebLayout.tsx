'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/common/TopBar';
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
  const store = globalDataStore.getState();
  const user = store.currentUser;

  // Compute pending approvals count
  const pendingApprovalsCount = store.expenses.filter(
    (e) => e.status === 'Submitted' || e.status === 'Under Review'
  ).length;

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

  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col font-sans">
      <TopBar />

      <div className="flex flex-1">
        {/* Desktop Persistent Sidebar (Zerodha style: dense, clean, restrained) */}
        <aside className="w-56 bg-white border-r border-[#E5E5E5] flex flex-col shrink-0">
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

          <div className="p-3 border-t border-[#E5E5E5] bg-[#FFFFFF] text-[10px] text-[#888888]">
            <div className="font-mono">Zawr Engine v1.0</div>
            <div>FY 2026-27 (Locked: 31-Mar-26)</div>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-x-hidden p-5">
          <div className="max-w-7xl mx-auto space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
};
