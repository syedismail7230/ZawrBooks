'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { globalDataStore } from '@/lib/store/dataStore';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const isAuth = globalDataStore.getState().isAuthenticated;
    if (isAuth) {
      router.replace('/web');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col items-center justify-center font-sans">
      <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin rounded-full mb-3"></div>
      <p className="text-xs uppercase font-mono tracking-widest text-[#666666]">
        Zawr Books Authentication Gateway...
      </p>
    </div>
  );
}
