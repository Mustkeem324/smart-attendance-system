'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckCircle2,
  CalendarDays,
  Users,
  History,
  Store,
  ShoppingBag,
  Radio,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isSales = user?.role && ['FIELD_SALES_REP', 'SALES_MANAGER'].includes(user.role);
  const isElevated =
    user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER'].includes(user.role);

  let links = [];

  if (isSales) {
    links = [
      { name: 'Field App', href: '/field-sales/mobile', icon: Store },
      { name: 'Visits', href: '/field-sales/visits', icon: Radio },
      { name: 'Orders', href: '/field-sales/orders', icon: ShoppingBag },
      { name: 'Punch', href: '/employee/dashboard', icon: CheckCircle2 },
      { name: 'Sales Hub', href: '/field-sales', icon: LayoutDashboard },
    ];
  } else if (isElevated) {
    links = [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Live HR', href: '/admin/attendance/live', icon: Radio },
      { name: 'Employees', href: '/employees', icon: Users },
      { name: 'Leaves', href: '/leaves', icon: CalendarDays },
      { name: 'Sales', href: '/field-sales', icon: Store },
    ];
  } else {
    links = [
      { name: 'Punch', href: '/employee/dashboard', icon: CheckCircle2 },
      { name: 'History', href: '/attendance/my-history', icon: History },
      { name: 'Leaves', href: '/leaves', icon: CalendarDays },
      { name: 'Field App', href: '/field-sales/mobile', icon: Store },
      { name: 'Shifts', href: '/shifts', icon: Clock },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-white/10 bg-master-navy/95 px-2 backdrop-blur-md shadow-2xl lg:hidden">
      {links.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== '/' && link.href !== '/admin/dashboard' && pathname.startsWith(link.href));
        const Icon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={`flex flex-col items-center justify-center py-1 text-[11px] font-semibold transition-all ${
              isActive ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
            <span className="mt-1 text-[10px] truncate max-w-[64px]">{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
