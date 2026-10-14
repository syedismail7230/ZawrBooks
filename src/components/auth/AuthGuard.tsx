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
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (!isMounted) return;

        if (data.authenticated && data.user) {
          // Sync with local data store
          globalDataStore.login(data.user);

          // Role check
          if (allowedRoles && !allowedRoles.includes(data.user.role)) {
            router.replace('/web?error=unauthorized');
            return;
          }

          setIsAuthorized(true);
        } else {
          globalDataStore.logout();
          const target = pathname !== '/' ? `/login?from=${encodeURIComponent(pathname)}` : '/login';
          router.replace(target);
        }
      } catch {
        if (!isMounted) return;
        // Fallback to store if offline/failed
        const current = globalDataStore.getState();
        if (current.isAuthenticated) {
          setIsAuthorized(true);
        } else {
          router.replace('/login');
        }
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    }

    checkSession();

    const unsubscribe = globalDataStore.subscribe(() => {
      const updated = globalDataStore.getState();
      if (!updated.isAuthenticated) {
        router.replace('/login');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router, pathname, allowedRoles]);

  if (isVerifying || !isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F4F3EF] flex flex-col items-center justify-center font-sans">
        <div className="w-7 h-7 border-2 border-black border-t-transparent animate-spin rounded-full mb-3"></div>
        <p className="text-[11px] uppercase font-mono tracking-widest text-[#666666]">
          Verifying Authenticated Session...
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
