'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, initializeDefaults } from '@/lib/storage';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    initializeDefaults();
    if (!getSession()) {
      router.replace('/');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1a14' }}>
        <div className="text-golf-muted">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" style={{ background: '#0f1a14' }}>
      {/* Tablet overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 hidden md:block lg:hidden"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar:
          - Mobile (<md): hidden entirely (bottom nav used)
          - Tablet (md–lg): fixed overlay, slides in/out
          - Desktop (lg+): always visible, shifts content via lg:ml-64 */}
      <aside
        className={[
          'fixed top-0 left-0 h-full z-40 w-64',
          'hidden md:block',
          'transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        ].join(' ')}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content area */}
      <div className="flex flex-col min-h-screen lg:ml-64">
        {/* Top header: visible on mobile + tablet, hidden on desktop */}
        <header
          className="lg:hidden flex items-center px-4 h-14 flex-shrink-0 sticky top-0 z-20"
          style={{ background: '#1a2e20', borderBottom: '1px solid #2a4530' }}
        >
          {/* Hamburger: tablet only (md–lg) */}
          <button
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-lg mr-3"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: '#223829', border: '1px solid #2a4530', color: '#8aad8f', minHeight: '44px', minWidth: '44px' }}
            aria-label="Abrir menú"
          >
            <span style={{ fontSize: '18px' }}>☰</span>
          </button>
          <span className="text-xl mr-2">⛳</span>
          <span className="font-display text-golf-gold text-base">Golf Tracker</span>
        </header>

        {/* Page content — padding-bottom for mobile bottom nav */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>

        {/* Bottom nav: mobile only, rendered by BottomNav (fixed, outside flow) */}
        <BottomNav />
      </div>
    </div>
  );
}
