'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/common/TopBar';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Building2, Users, CheckSquare, History, ShieldAlert } from 'lucide-react';

export const ControlLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Organization Overview', href: '/control', icon: Building2 },
    { name: 'User & Access RBAC', href: '/control/users', icon: Users },
    { name: 'Approval Policies', href: '/control/approval-policies', icon: CheckSquare },
    { name: 'Audit & Integrity Monitor', href: '/control/audit', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col font-sans">
      <TopBar />

      <div className="bg-[#111111] text-white px-6 py-4 border-b border-[#222222]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo variant="icon" className="w-5 h-5 shrink-0" />
            <h1 className="text-sm font-bold uppercase tracking-wider">
              Zawr Books Control Centre
            </h1>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            Administrative Governance & Policy Configuration
          </span>
        </div>
      </div>

      <div className="flex flex-1">
        <aside className="w-56 bg-white border-r border-[#E5E5E5] flex flex-col shrink-0">
          <nav className="p-2 space-y-1">
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
        </aside>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
