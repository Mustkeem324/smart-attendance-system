'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Radio,
  Users,
  Building2,
  MapPin,
  FileText,
  BarChart3,
  CalendarDays,
  Palmtree,
  Clock,
  CreditCard,
  Bell,
  ShieldAlert,
  Settings,
  CheckCircle2,
  AlertCircle,
  History,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Truck,
  Store,
  Package,
  ShieldCheck,
  FileSpreadsheet,
  Receipt,
  Boxes,
  Target,
  Sliders,
  Smartphone,
  QrCode,
  ShoppingBag,
  FileCheck,
  UploadCloud,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isElevated = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER'].includes(user.role);
  const isSalesElevated = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER', 'SALES_MANAGER', 'FIELD_SALES_REP', 'INVENTORY_MANAGER'].includes(user.role);

  // 14 Core HR Administration Navigation Items
  const adminNavigation = [
    { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Live Attendance', href: '/admin/attendance/live', icon: Radio, badge: 'LIVE' },
    { name: 'Employee Management', href: '/employees', icon: Users },
    { name: 'Departments', href: '/departments', icon: Building2 },
    { name: 'Branches', href: '/branches', icon: MapPin },
    { name: 'Attendance Reports', href: '/reports', icon: FileText },
    { name: 'Attendance Analytics', href: '/admin/analytics', icon: BarChart3, badge: 'PRO' },
    { name: 'Leave Management', href: '/leaves', icon: CalendarDays },
    { name: 'Holiday Calendar', href: '/holidays', icon: Palmtree },
    { name: 'Shift Management', href: '/shifts', icon: Clock },
    { name: 'Payroll', href: '/payroll', icon: CreditCard },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    { name: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Mobile Phones, Accessories & Electronics Sales Navigation Items
  const fieldSalesNavigation = [
    { name: 'Electronics Sales Dashboard', href: '/field-sales', icon: LayoutDashboard },
    { name: 'Retailer & Dealer Directory', href: '/field-sales/shops', icon: Store },
    { name: 'Shop Visit Monitor', href: '/field-sales/visits', icon: Radio, badge: 'LIVE' },
    { name: 'Mobile & Electronics Catalog', href: '/field-sales/products', icon: Smartphone },
    { name: 'IMEI & Serial Inventory', href: '/field-sales/imei', icon: QrCode, badge: 'IMEI' },
    { name: 'Sales Orders & Bookings', href: '/field-sales/orders', icon: ShoppingBag },
    { name: 'Product Deliveries', href: '/field-sales/deliveries', icon: Truck },
    { name: 'Delivery Verification', href: '/field-sales/verification', icon: ShieldCheck, badge: 'AUDIT' },
    { name: 'Tax Invoices & Billing', href: '/field-sales/invoices', icon: FileCheck },
    { name: 'Payment Collections', href: '/field-sales/payments', icon: Receipt },
    { name: 'Dealer Credit & Ledger', href: '/field-sales/ledger', icon: CreditCard },
    { name: 'Warehouse Inventory', href: '/field-sales/inventory', icon: Boxes },
    { name: 'Sales Representatives', href: '/field-sales/representatives', icon: Users },
    { name: 'Sales Targets & Quotas', href: '/field-sales/targets', icon: Target },
    { name: 'Sales & Inventory Reports', href: '/field-sales/reports', icon: FileSpreadsheet },
    { name: 'Real Data Import Center', href: '/field-sales/import', icon: UploadCloud, badge: 'IMPORT' },
    { name: 'Distribution Settings', href: '/field-sales/settings', icon: Sliders },
  ];

  const employeeNavigation = [
    { name: 'My Attendance & Punch', href: '/employee/dashboard', icon: CheckCircle2 },
    { name: 'My Attendance History', href: '/attendance/my-history', icon: History },
    { name: 'Attendance Exceptions', href: '/attendance/exceptions', icon: AlertCircle },
    { name: 'My Leaves & Holidays', href: '/leaves', icon: CalendarDays },
    { name: 'My Shifts & Swaps', href: '/shifts', icon: Clock },
    { name: 'Field Sales & Visits', href: '/field-sales/mobile', icon: Store, badge: 'MOBILE' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container with Master UI Deep Navy */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-master-navy text-slate-200 shadow-2xl transition-all duration-300 lg:static ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header / Brand */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-master-indigo text-white shadow-lg shadow-master-indigo/40">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="truncate">
                <span className="block text-sm font-extrabold tracking-wide text-white">
                  SmartHRMS
                </span>
                <span className="block text-[10px] font-medium text-indigo-300">
                  Enterprise Cloud Suite
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-master-indigo text-white shadow-lg shadow-master-indigo/40">
              <Sparkles className="h-5 w-5" />
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:block transition"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Employee Self-Service Section */}
          <div>
            {!isCollapsed && (
              <h3 className="mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Self Service Portal
              </h3>
            )}
            <div className="space-y-1">
              {employeeNavigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-master-indigo text-white shadow-md shadow-master-indigo/30 font-bold'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 14 Core Admin Modules */}
          {isElevated && (
            <div>
              {!isCollapsed && (
                <h3 className="mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  HR Administration (14)
                </h3>
              )}
              <div className="space-y-1">
                {adminNavigation.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      title={isCollapsed ? item.name : undefined}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-master-indigo text-white shadow-md shadow-master-indigo/30 font-bold'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </div>
                      {!isCollapsed && item.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                            item.badge === 'LIVE'
                              ? 'animate-pulse bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* MOBILE & ELECTRONICS DISTRIBUTION Section */}
          {isSalesElevated && (
            <div>
              {!isCollapsed && (
                <h3 className="mb-2 px-3 text-[10px] font-bold tracking-wider text-indigo-300 uppercase flex items-center justify-between">
                  <span>Mobile &amp; Electronics Sales</span>
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-indigo-300 border border-indigo-500/30">PRO</span>
                </h3>
              )}
              <div className="space-y-1">
                {fieldSalesNavigation.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/field-sales' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      title={isCollapsed ? item.name : undefined}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-master-indigo text-white shadow-md shadow-master-indigo/30 font-bold'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </div>
                      {!isCollapsed && item.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                            item.badge === 'LIVE'
                              ? 'animate-pulse bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.badge === 'AUDIT'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Geofence Status */}
        {!isCollapsed && (
          <div className="border-t border-white/10 p-3.5 bg-black/20">
            <div className="rounded-xl bg-white/5 p-3 text-xs border border-white/10">
              <div className="flex items-center justify-between text-slate-200">
                <span className="text-[11px] font-bold tracking-wide text-indigo-300">GEOFENCE ACTIVE</span>
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                50m / 100m Live Haversine Verified
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
