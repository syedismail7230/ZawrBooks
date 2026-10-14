'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/common/TopBar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { Home, Scan, FileText, Bell, User } from 'lucide-react';

export const MobileLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/mobile', icon: Home },
    { label: 'Submissions', href: '/mobile/submissions', icon: FileText },
    { label: 'Scan', href: '#scan', icon: Scan, isScanButton: true },
    { label: 'Alerts', href: '/mobile/notifications', icon: Bell },
    { label: 'Profile', href: '/mobile/profile', icon: User },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F4F3EF] flex flex-col font-sans pb-16">
        <TopBar />

        <main className="flex-1 max-w-md mx-auto w-full p-4 space-y-4">
          {children}
        </main>

      {/* Mobile Fixed Bottom Navigation (PRD Section 4.2) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E5E5E5] z-50">
        <div className="max-w-md mx-auto flex items-center justify-around h-14">
          {navItems.map((item, idx) => {
            if (item.isScanButton) {
              return (
                <button
                  key={idx}
                  onClick={() => setIsScannerOpen(true)}
                  className="flex flex-col items-center justify-center -mt-4 bg-[#111111] text-white w-12 h-12 border-2 border-white shadow-md rounded-none active:scale-95 transition-transform"
                  title="Scan Receipt"
                >
                  <Scan size={20} />
                  <span className="text-[9px] font-bold mt-0.5">SCAN</span>
                </button>
              );
            }

            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={idx}
                href={item.href}
                className={`flex flex-col items-center justify-center w-14 h-full text-[10px] transition-colors ${
                  isActive ? 'text-[#111111] font-bold' : 'text-[#777777] hover:text-[#111111]'
                }`}
              >
                <Icon size={18} />
                <span className="mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
      </div>
    </AuthGuard>
  );
};
