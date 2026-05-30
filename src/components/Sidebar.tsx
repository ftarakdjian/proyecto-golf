'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession } from '@/lib/storage';
import { useUser } from '@/lib/user-context';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/rounds/new', label: 'Nueva Ronda', icon: '⛳' },
  { href: '/rounds', label: 'Rondas', icon: '📋' },
];

const ADMIN_ITEM = { href: '/admin', label: 'Administración', icon: '⚙️' };

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { username, role } = useUser();

  const handleLogout = () => {
    clearSession();
    toast.success('Sesión cerrada');
    router.push('/');
  };

  const navItems = role === 'admin' ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  const isActive = (href: string) => {
    if (href === '/rounds/new') return pathname === '/rounds/new';
    if (href === '/rounds') return pathname === '/rounds' || (pathname.startsWith('/rounds/') && pathname !== '/rounds/new');
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#1a2e20', borderRight: '1px solid #2a4530' }}>
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #2a4530' }}>
        <span className="text-2xl">⛳</span>
        <div>
          <h1 className="font-display text-golf-gold text-lg leading-tight">Golf Tracker</h1>
          <p className="text-golf-muted text-xs">Tarakdjian</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-3" style={{ borderBottom: '1px solid #2a4530' }}>
        <p className="text-golf-text text-sm font-medium">{username}</p>
        {role === 'admin' && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#0f4a28', color: '#2d9e5f' }}>
            Admin
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150',
              isActive(item.href)
                ? 'text-golf-text'
                : 'text-golf-muted hover:text-golf-text hover:bg-white/5'
            )}
            style={isActive(item.href) ? { background: '#223829' } : {}}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5" style={{ borderTop: '1px solid #2a4530', paddingTop: '12px' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-golf-muted hover:text-red-400 transition-colors"
          style={{ minHeight: '44px' }}
        >
          <span>↩</span>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
