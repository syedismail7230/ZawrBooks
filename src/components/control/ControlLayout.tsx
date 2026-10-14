'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/common/TopBar';
import { BrandLogo } from '@/components/common/BrandLogo';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Building2, Users, CheckSquare, History } from 'lucide-react';

export const ControlLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Organization Overview', href: '/control', icon: Building2, shortName: 'Overview' },
    { name: 'User & Access RBAC', href: '/control/users', icon: Users, shortName: 'RBAC Users' },
    { name: 'Approval Policies', href: '/control/approval-policies', icon: CheckSquare, shortName: 'Policies' },
    { name: 'Audit & Integrity Monitor', href: '/control/audit', icon: History, shortName: 'Audit' },
  ];

  return (
    <AuthGuard allowedRoles={['owner']}>
      <div className="min-h-screen bg-[#F4F3EF] flex flex-col font-sans">
        <TopBar />

        {/* Control Centre Executive Header Banner */}
        <div className="bg-[#111111] text-white px-4 sm:px-6 py-3 sm:py-4 border-b border-[#222222]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <BrandLogo variant="icon" className="w-5 h-5 shrink-0" />
              <div>
                <h1 className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                  Zawr Books Control Centre
                </h1>
                <span className="text-[10px] text-gray-400 font-mono sm:hidden">
                  CEO Governance & RBAC
                </span>
              </div>
            </div>
            <span className="hidden sm:inline text-[11px] text-gray-400 font-mono">
              Administrative Governance & Policy Configuration
            </span>
          </div>
        </div>

        {/* Mobile Horizontal Tabs Navigation (Visible on screens < lg) */}
        <div className="lg:hidden bg-white border-b border-[#E5E5E5] px-3 py-1.5 overflow-x-auto whitespace-nowrap shadow-2xs">
          <div className="flex items-center gap-1.5 min-w-max">
            {navItems.map((item) => {
              const isActive =
                item.href === '/control'
                  ? pathname === '/control'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors rounded-xs ${
                    isActive
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#F4F3EF] text-[#555555] hover:text-[#111111] hover:bg-[#EAE8E2] border border-[#E5E5E5]'
                  }`}
                >
                  <Icon size={13} />
                  <span>{item.shortName || item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1">
          {/* Desktop Persistent Sidebar */}
          <aside className="hidden lg:flex w-56 bg-white border-r border-[#E5E5E5] flex-col shrink-0">
            <div className="p-3 border-b border-[#F0EFEA] text-[10px] font-bold uppercase tracking-wider text-[#777777]">
              CEO Governance
            </div>

            <nav className="p-2 space-y-1 flex-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/control'
                    ? pathname === '/control'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium border-l-2 transition-colors ${
                      isActive
                        ? 'border-[#111111] bg-[#F4F3EF] text-[#111111] font-semibold'
                        : 'border-transparent text-[#555555] hover:text-[#111111] hover:bg-[#FAFAF9]'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#E5E5E5] bg-[#FFFFFF] flex items-center gap-2">
              <div className="text-[10px] text-[#888888] font-mono">
                Strict CEO Authorization Active
              </div>
            </div>
          </aside>

          {/* Main Content Workspace */}
          <main className="flex-1 overflow-x-hidden p-3.5 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};
