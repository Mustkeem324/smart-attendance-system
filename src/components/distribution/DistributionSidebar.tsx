'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SalmanLogo, { SalmanIcon } from '@/components/brand/SalmanLogo';
import {
  LayoutDashboard,
  Smartphone,
  Layers,
  Award,
  Boxes,
  ShoppingCart,
  FileSpreadsheet,
  Store,
  UserPlus,
  Users2,
  MapPin,
  Truck,
  Warehouse as WarehouseIcon,
  Network,
  Receipt,
  CreditCard,
  BookOpen,
  Tag,
  BarChart3,
  Bell,
  ShieldCheck,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface SidebarItem {
  id: string;
  name: string;
  href: string;
  icon: any;
  badge?: number | string;
  badgeColor?: string;
}

interface SidebarGroup {
  group: string;
  items: SidebarItem[];
}

export function DistributionSidebar({
  isMobileOpen,
  setIsMobileOpen,
}: {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState<{
    pendingOrders?: number;
    lowStock?: number;
    pendingApps?: number;
    unreadNotifs?: number;
  }>({});

  useEffect(() => {
    // Fetch live badge counters
    async function fetchCounts() {
      try {
        const res = await fetch('/api/v1/dashboard');
        if (res.ok) {
          const data = await res.json();
          setCounts({
            pendingOrders: data.data?.kpis?.pendingFulfillment?.value || 0,
            lowStock: data.data?.tables?.lowStockProducts?.length || 0,
            pendingApps: data.data?.tables?.pendingInquiries?.length || 0,
          });
        }
      } catch (err) {
        // quiet fallback
      }
    }
    fetchCounts();
  }, []);

  const navigationGroups: SidebarGroup[] = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard', name: 'Dashboard', href: '/distribution', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Catalog & Inventory',
      items: [
        { id: 'products', name: 'Products', href: '/distribution/products', icon: Smartphone },
        { id: 'categories', name: 'Categories', href: '/distribution/categories', icon: Layers },
        { id: 'brands', name: 'Brands', href: '/distribution/brands', icon: Award },
        {
          id: 'inventory',
          name: 'Inventory',
          href: '/distribution/inventory',
          icon: Boxes,
          badge: counts.lowStock ? `${counts.lowStock} Low` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        },
        { id: 'warehouses', name: 'Warehouses', href: '/distribution/warehouses', icon: WarehouseIcon },
        { id: 'network', name: 'Distribution Network', href: '/distribution/network', icon: Network },
      ],
    },
    {
      group: 'B2B Sales & Dealers',
      items: [
        {
          id: 'orders',
          name: 'Orders',
          href: '/distribution/orders',
          icon: ShoppingCart,
          badge: counts.pendingOrders ? `${counts.pendingOrders}` : undefined,
          badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        },
        { id: 'quotations', name: 'Quotations', href: '/distribution/quotations', icon: FileSpreadsheet },
        { id: 'retailers', name: 'Retailers CRM', href: '/distribution/retailers', icon: Store },
        {
          id: 'applications',
          name: 'Retailer Inquiries',
          href: '/distribution/retailer-applications',
          icon: UserPlus,
          badge: counts.pendingApps ? `${counts.pendingApps} New` : undefined,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        },
        { id: 'promotions', name: 'Promotions', href: '/distribution/promotions', icon: Tag },
      ],
    },
    {
      group: 'Field & Logistics',
      items: [
        { id: 'sales-team', name: 'Sales Team', href: '/distribution/sales-team', icon: Users2 },
        { id: 'field-visits', name: 'Field Visits', href: '/distribution/field-visits', icon: MapPin },
        { id: 'deliveries', name: 'Deliveries', href: '/distribution/deliveries', icon: Truck },
      ],
    },
    {
      group: 'Finance & Accounts',
      items: [
        { id: 'invoices', name: 'GST Invoices', href: '/distribution/invoices', icon: Receipt },
        { id: 'payments', name: 'Payments', href: '/distribution/payments', icon: CreditCard },
        { id: 'ledger', name: 'Dealer Ledger', href: '/distribution/ledger', icon: BookOpen },
        { id: 'reports', name: 'Reports & Analytics', href: '/distribution/reports', icon: BarChart3 },
      ],
    },
    {
      group: 'Administration',
      items: [
        { id: 'notifications', name: 'Notifications', href: '/distribution/notifications', icon: Bell },
        { id: 'users', name: 'User Management', href: '/distribution/users', icon: ShieldCheck },
        { id: 'audit-logs', name: 'Audit Logs', href: '/distribution/audit-logs', icon: History },
        { id: 'settings', name: 'Settings', href: '/distribution/settings', icon: Settings },
      ],
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#10132A] border-r border-[#23294E] select-none text-slate-300">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#23294E] shrink-0 bg-[#0c0e22]">
        <Link href="/distribution" className="flex items-center gap-2.5 overflow-hidden group">
          <SalmanIcon className="w-8 h-8 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sm text-white tracking-wide">SALMAN ENTERPRISES</span>
              <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Enterprise Distribution</span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2348] transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2348]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Modules */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {navigationGroups.map((grp) => (
          <div key={grp.group} className="space-y-1">
            {!collapsed && (
              <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {grp.group}
              </div>
            )}
            {grp.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/distribution' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#713BFF] to-[#804DFF] text-white shadow-md shadow-purple-900/40 ring-1 ring-purple-400/30'
                      : 'text-slate-300 hover:bg-[#161B3D] hover:text-white'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-400'
                    }`}
                  />
                  {!collapsed && <span className="truncate flex-1">{item.name}</span>}
                  {!collapsed && item.badge && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold tracking-tight ${item.badgeColor || 'bg-purple-500/20 text-purple-300'}`}>
                      {item.badge}
                    </span>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-400 ring-2 ring-[#10132A]" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Quick Portal Switcher Footer */}
      <div className="p-3 border-t border-[#23294E] bg-[#0c0e22] shrink-0">
        {!collapsed ? (
          <div className="space-y-2">
            <Link
              href="/"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#151A38] hover:bg-[#1C234E] text-slate-300 hover:text-white text-xs transition-colors border border-white/5"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Public Website</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/catalog"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#151A38] hover:bg-[#1C234E] text-slate-300 hover:text-white text-xs transition-colors border border-white/5"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>B2B Catalog</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        ) : (
          <div className="flex justify-center">
            <Link href="/" title="Public Website" className="p-2 text-slate-400 hover:text-white">
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`fixed top-0 bottom-0 left-0 transition-all duration-300 z-30 ${collapsed ? 'w-20' : 'w-64'}`}>
          {content}
        </div>
      </aside>

      {/* Mobile & Tablet Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70  transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
