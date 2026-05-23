'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { saveSession } from '@/lib/storage';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/rounds/new', label: 'Nueva Ronda', icon: '⛳' },
  { href: '/rounds', label: 'Rondas', icon: '📋' },
  { href: '/admin', label: 'Administración', icon: '⚙️' },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    saveSession(false);
    toast.success('Sesión cerrada');
    router.push('/');
  };

  const isActive = (href: string) => {
    if (href === '/rounds/new') return pathname === '/rounds/new';
    if (href === '/rounds') return pathname === '/rounds' || (pathname.startsWith('/rounds/') && pathname !== '/rounds/new');
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="w-64 min-h-full flex flex-col h-full"
      style={{
        background: '#1a2e20',
        borderRight: '1px solid #2a4530',
      }}
    >
      {/* Logo */}
      <div
        className="px-6 py-5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid #2a4530' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">⛳</span>
          <div>
            <h1 className="font-display text-golf-gold text-lg leading-tight">Golf Tracker</h1>
            <p className="text-golf-muted text-xs">Tarakdjian</p>
          </div>
        </div>
        {/* Close button: tablet only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-golf-muted hover:text-golf-text transition-colors"
            style={{ background: '#223829', minHeight: '44px', minWidth: '44px' }}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                active ? 'text-golf-text' : 'text-golf-muted hover:text-golf-text'
              )}
              style={
                active
                  ? { background: '#1a6b3c', color: '#e8f0e9', minHeight: '44px' }
                  : { minHeight: '44px' }
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: '1px solid #2a4530' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-golf-muted hover:text-golf-text w-full transition-all duration-150"
          style={{ minHeight: '44px' }}
        >
          <span className="w-5 text-center">🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
