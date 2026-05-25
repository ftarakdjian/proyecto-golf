'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/storage';
import LoginPage from '@/components/LoginPage';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (getSession()) {
      router.replace('/dashboard');
    }
  }, [router]);

  return <LoginPage />;
}
