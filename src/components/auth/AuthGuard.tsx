'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { globalDataStore } from '@/lib/store/dataStore';
import { UserRole } from '@/types';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [storeState, setStoreState] = useState(globalDataStore.getState());

  useEffect(() => {
    // Check initial state
    const current = globalDataStore.getState();
    setStoreState(current);

    if (!current.isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(current.currentUser.role)) {
      // Role not allowed for this route
      if (pathname.startsWith('/control')) {
        router.replace('/web');
        return;
      }
    }

    setIsReady(true);

    const unsubscribe = globalDataStore.subscribe(() => {
      const updated = globalDataStore.getState();
      setStoreState(updated);
      if (!updated.isAuthenticated) {
        router.replace('/login');
      }
    });

    return unsubscribe;
  }, [router, pathname, allowedRoles]);

  if (!isReady || !storeState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F4F3EF] flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin rounded-full mb-3"></div>
        <p className="text-xs uppercase font-mono tracking-widest text-[#666666]">
          Verifying Authenticated Session...
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
