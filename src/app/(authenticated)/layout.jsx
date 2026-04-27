'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Layout from '@/components/Layout.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

export default function AuthenticatedLayout({ children }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [session, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return <Layout>{children}</Layout>;
}
