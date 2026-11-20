'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Smartphone,
  ShoppingBag,
  User,
  Radio,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { getOfflineQueue } from '@/lib/offline-sync-engine';

export default function AndroidBottomNav() {
  const pathname = usePathname();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const updateQueue = () => {
      const queue = getOfflineQueue();
      const pending = queue.filter(
        (i) => i.status === 'SAVED_OFFLINE' || i.status === 'WAITING_TO_SYNC' || i.status === 'SYNC_FAILED'
      );
      setPendingSyncCount(pending.length);
    };

    updateQueue();
    window.addEventListener('apex_offline_queue_changed', updateQueue);
    return () => window.removeEventListener('apex_offline_queue_changed', updateQueue);
  }, []);

  const navItems = [
    {
      name: 'Field Sales',
      href: '/field-sales/mobile',
      icon: Store,
      badge: pendingSyncCount > 0 ? `${pendingSyncCount} sync` : null,
    },
    {
      name: 'Catalog',
      href: '/catalog',
      icon: Smartphone,
    },
    {
      name: 'Console',
      href: '/distribution',
      icon: LayoutDashboard,
    },
    {
      name: 'Orders',
      href: '/field-sales/orders',
      icon: ShoppingBag,
    },
    {
      name: 'Roster / HR',
      href: '/employee/dashboard',
      icon: Clock,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-[#23294E] bg-[#0E122A]/95 backdrop-blur-xl px-1 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Android Bottom Navigation"
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && item.href !== '/distribution' && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {/* Active Pill Indicator (Android Material 3 inspired) */}
            <div
              className={`flex h-8 w-12 items-center justify-center rounded-2xl transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-600/30'
                  : 'bg-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            </div>

            <span
              className={`mt-0.5 text-[10px] tracking-tight truncate max-w-[62px] ${
                isActive ? 'font-bold text-purple-300' : 'font-medium text-slate-400'
              }`}
            >
              {item.name}
            </span>

            {/* Offline Sync or Alert Badge */}
            {item.badge && (
              <span className="absolute top-1 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-black shadow-sm animate-pulse">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
