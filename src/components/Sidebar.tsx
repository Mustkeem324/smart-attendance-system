'use client';

import React, { useState } from 'react';
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
  Clock,
  CreditCard,
  Settings,
  CheckCircle2,
  AlertCircle,
  History,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Store,
  Smartphone,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Boxes,
  Sliders,
  LogOut,
  Shield,
  Layers,
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
  const { user, logout } = useAuth();
  const [salesExpanded, setSalesExpanded] = useState(false);

  const isElevated = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER'].includes(user.role);
  const isSalesElevated = user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER', 'SALES_MANAGER', 'FIELD_SALES_REP', 'INVENTORY_MANAGER'].includes(user.role);

  // Self Service Portal
  const selfServiceNavigation = [
    { name: 'My Attendance & Punch', href: '/employee/dashboard', icon: CheckCircle2 },
    { name: 'Attendance History', href: '/attendance/my-history', icon: History },
    { name: 'Attendance Exceptions', href: '/attendance/exceptions', icon: AlertCircle },
    { name: 'Leaves & Holidays', href: '/leaves', icon: CalendarDays },
    { name: 'Shifts & Swaps', href: '/shifts', icon: Clock },
    { name: 'Field Sales & Visits', href: '/field-sales/mobile', icon: Store, badge: 'MOBILE' },
  ];

  // HR Administration
  const adminNavigation = [
    { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Live Attendance', href: '/admin/attendance/live', icon: Radio, badge: 'LIVE' },
    { name: 'Employee Management', href: '/employees', icon: Users },
    { name: 'Departments', href: '/departments', icon: Building2 },
    { name: 'Branches & Locations', href: '/branches', icon: MapPin },
    { name: 'Attendance Reports', href: '/reports', icon: FileText },
    { name: 'Attendance Analytics', href: '/admin/analytics', icon: BarChart3, badge: 'PRO' },
    { name: 'Leave Management', href: '/leaves', icon: CalendarDays },
    { name: 'Shift Management', href: '/shifts', icon: Clock },
    { name: 'Payroll (Phase 2)', href: '/payroll', icon: CreditCard },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Mobile & Electronics Distribution (Expandable)
  const distributionNavigation = [
    { name: 'Distribution Hub', href: '/field-sales', icon: LayoutDashboard },
    { name: 'Retailer Network', href: '/field-sales/shops', icon: Store },
    { name: 'Shop Visits & GPS', href: '/field-sales/visits', icon: Radio, badge: 'LIVE' },
    { name: 'Catalog & IMEI Stock', href: '/field-sales/products', icon: Smartphone },
    { name: 'B2B Sales Orders', href: '/field-sales/orders', icon: ShoppingBag },
    { name: 'Dispatch & Deliveries', href: '/field-sales/deliveries', icon: Truck },
    { name: 'Warehouse Inventory', href: '/field-sales/inventory', icon: Boxes },
    { name: 'Distribution Settings', href: '/field-sales/settings', icon: Sliders },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container with Premium Dark Navy */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-[#0C0E22] text-slate-200 shadow-2xl transition-all duration-300 ease-in-out lg:static ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7138F5] text-white shadow-lg shadow-[#7138F5]/40 ring-1 ring-white/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="truncate">
                <span className="block text-sm font-extrabold tracking-wide text-white">
                  Salman Enterprises
                </span>
                <span className="block text-[10px] font-medium text-purple-300">
                  SmartHRMS &bull; Cloud Suite
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-[#7138F5] text-white shadow-lg shadow-[#7138F5]/40 ring-1 ring-white/20">
              <Sparkles className="h-4 w-4" />
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition lg:block"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle sidebar collapse"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Section 1: Self Service Portal */}
          <div>
            {!isCollapsed && (
              <h3 className="mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Self Service Portal
              </h3>
            )}
            <div className="space-y-1">
              {selfServiceNavigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    title={isCollapsed ? item.name : undefined}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#7138F5] text-white shadow-md shadow-[#7138F5]/30 font-bold'
                        : 'text-slate-300 hover:bg-white/8 hover:text-white'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-300'}`} />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-black text-purple-300 border border-purple-500/30">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section 2: HR Administration */}
          {isElevated && (
            <div>
              {!isCollapsed && (
                <h3 className="mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  HR Administration
                </h3>
              )}
              <div className="space-y-1">
                {adminNavigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin/dashboard' && item.href !== '/leaves' && item.href !== '/shifts' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      title={isCollapsed ? item.name : undefined}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-[#7138F5] text-white shadow-md shadow-[#7138F5]/30 font-bold'
                          : 'text-slate-300 hover:bg-white/8 hover:text-white'
                      } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-300'}`} />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </div>
                      {!isCollapsed && item.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
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

          {/* Section 3: Field Sales & Distribution */}
          {isSalesElevated && (
            <div>
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => setSalesExpanded(!salesExpanded)}
                  className="flex w-full items-center justify-between px-3 py-1 text-[10px] font-bold tracking-wider text-purple-300 uppercase hover:text-white transition"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-purple-400" />
                    <span>Distribution & Sales</span>
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-purple-400 transition-transform duration-200 ${
                      salesExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}
              {(!isCollapsed ? salesExpanded : true) && (
                <div className="mt-1 space-y-1">
                  {distributionNavigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/field-sales' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClose}
                        title={isCollapsed ? item.name : undefined}
                        className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? 'bg-[#7138F5] text-white shadow-md shadow-[#7138F5]/30 font-bold'
                            : 'text-slate-300 hover:bg-white/8 hover:text-white'
                        } ${isCollapsed ? 'justify-center px-2' : ''}`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-300'}`} />
                          {!isCollapsed && <span className="truncate">{item.name}</span>}
                        </div>
                        {!isCollapsed && item.badge && (
                          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-black text-emerald-300 border border-emerald-500/30">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: User Profile & Geofence Status */}
        <div className="border-t border-white/10 p-3 bg-black/25">
          {/* Active Geofence Indicator */}
          {!isCollapsed && (
            <div className="mb-2.5 rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-purple-300 uppercase">
                  GEOFENCE RADAR
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active (100m)
                </span>
              </div>
            </div>
          )}

          {/* User Profile Card */}
          {user && (
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-xs font-black text-white shadow">
                  SE
                </div>
                {!isCollapsed && (
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">
                      Salman Enterprises
                    </p>
                    <p className="text-[10px] text-purple-300 truncate">
                      {user.role?.replace('_', ' ') || 'SUPER ADMIN'}
                    </p>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <button
                  onClick={() => logout()}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
                  title="Sign Out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
