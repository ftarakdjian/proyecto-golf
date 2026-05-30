'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/user-context';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Stats', icon: '📊' },
  { href: '/rounds/new', label: 'Nueva', icon: '➕' },
  { href: '/rounds', label: 'Rondas', icon: '🏌️' },
];

const ADMIN_ITEM = { href: '/admin', label: 'Admin', icon: '⚙️' };

export default function BottomNav() {
  const pathname = usePathname();
  const { role } = useUser();

  const items = role === 'admin' ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  const isActive = (href: string) => {
    if (href === '/rounds/new') return pathname === '/rounds/new';
    if (href === '/rounds') return pathname === '/rounds' || (pathname.startsWith('/rounds/') && pathname !== '/rounds/new');
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 md:hidden"
      style={{ background: '#1a2e20', borderTop: '1px solid #2a4530', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around" style={{ height: '60px' }}>
        {items.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors"
              style={{
                color: active ? '#2d9e5f' : '#8aad8f',
                borderTop: `2px solid ${active ? '#1a6b3c' : 'transparent'}`,
                minHeight: '44px',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
              <span className="text-xs font-medium mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
