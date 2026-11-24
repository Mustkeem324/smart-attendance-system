'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Calendar,
  Building2,
  Plus,
  LogOut,
  User,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Menu,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import PlatformModeSwitcher from '@/components/mobile/PlatformModeSwitcher';

export function DistributionHeader({
  onOpenSearch,
  onToggleMobile,
}: {
  onOpenSearch: () => void;
  onToggleMobile: () => void;
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [dateRange, setDateRange] = useState('This Month (Nov 2026)');

  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const quickActionsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, notifRes] = await Promise.all([
          fetch('/api/v1/auth/me'),
          fetch('/api/v1/notifications'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.data?.user);
        }

        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotifications(notifData.data || []);
          setUnreadCount(notifData.unreadCount || 0);
        }
      } catch (err) {
        // quiet fallback
      }
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch('/api/v1/notifications/mark-read', { method: 'PUT' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="h-16 bg-[#10132A] border-b border-[#23294E] sticky top-0 z-40 flex items-center justify-between px-3 sm:px-4 lg:px-6 w-full max-w-full overflow-visible">
      {/* Left: Mobile Toggle & Workspace Switcher */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1F44] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#151A38] border border-white/5 text-xs text-slate-300">
          <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-semibold text-white truncate max-w-[150px] md:max-w-none">Salman Enterprises Central Hub</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium shrink-0">
            Live Node
          </span>
        </div>
      </div>

      {/* Middle: Global Search bar (Cmd+K) */}
      <div className="flex-1 max-w-xs xl:max-w-md mx-2 hidden lg:block min-w-0">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#151A38] hover:bg-[#1A2147] border border-[#23294E] hover:border-purple-500/40 text-slate-400 text-xs transition-all cursor-pointer shadow-inner"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="truncate">Search products, IMEI, orders, dealers...</span>
          </span>
          <kbd className="px-2 py-0.5 rounded bg-[#10132A] border border-white/10 text-[10px] font-mono text-slate-300 shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <PlatformModeSwitcher />

        {/* Date Filter */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => {
              const ranges = ['Today', 'Last 7 Days', 'This Month (Nov 2026)', 'Q4 2026'];
              const idx = ranges.indexOf(dateRange);
              setDateRange(ranges[(idx + 1) % ranges.length]);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#151A38] border border-[#23294E] hover:border-purple-500/30 text-xs text-slate-300 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>{dateRange}</span>
          </button>
        </div>

        {/* Quick Action Button */}
        <div ref={quickActionsRef} className="relative">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#713BFF] to-[#804DFF] hover:from-[#6228F5] hover:to-[#713BFF] text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Action</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {showQuickActions && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <Link
                href="/distribution/orders"
                onClick={() => setShowQuickActions(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-[#1E2552] hover:text-white"
              >
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Create B2B Order</span>
              </Link>
              <Link
                href="/distribution/quotations"
                onClick={() => setShowQuickActions(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-[#1E2552] hover:text-white"
              >
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Create Quotation</span>
              </Link>
              <Link
                href="/distribution/products"
                onClick={() => setShowQuickActions(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-[#1E2552] hover:text-white"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Hardware Product</span>
              </Link>
              <Link
                href="/distribution/payments"
                onClick={() => setShowQuickActions(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-[#1E2552] hover:text-white"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Record Payment Collection</span>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-[#151A38] hover:bg-[#1C234E] text-slate-300 hover:text-white border border-[#23294E] relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF5574] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#10132A]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-3.5 border-b border-[#23294E] flex items-center justify-between bg-[#111533]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#23294E]/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No alerts or notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-3 text-xs hover:bg-[#1C234E] transition-colors ${
                        !n.isRead ? 'bg-purple-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'STOCK' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : n.type === 'ORDER' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Bell className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-0.5">
                          <p className="font-medium text-slate-200">{n.title}</p>
                          <p className="text-[11px] text-slate-400 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-slate-400 pt-1">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-[#23294E] bg-[#111533] text-center">
                <Link
                  href="/distribution/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl bg-[#151A38] hover:bg-[#1C234E] border border-[#23294E] transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
              {currentUser?.employee?.profilePhoto || currentUser?.profilePhoto ? (
                <img
                  src={currentUser.employee?.profilePhoto || currentUser.profilePhoto}
                  alt={currentUser.name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser?.name?.slice(0, 1) || 'A'
              )}
            </div>
            <div className="hidden xl:flex flex-col text-left leading-tight pr-1">
              <span className="text-xs font-semibold text-white truncate max-w-[110px]">
                {currentUser?.name || 'Salman (Owner & HR)'}
              </span>
              <span className="text-[10px] text-purple-400 font-medium">
                {currentUser?.role || 'SUPER_ADMIN'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#151A38] border border-[#23294E] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="p-3 border-b border-[#23294E] mb-1">
                <p className="text-xs font-semibold text-white">{currentUser?.name || 'Salman (Owner, HR & Super Admin)'}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || 'salmanenterprisesphu@gmail.com'}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] font-medium text-purple-300">
                  <Shield className="w-3 h-3 text-purple-400" />
                  <span>{currentUser?.role || 'SUPER_ADMIN'}</span>
                </div>
              </div>

              <div className="space-y-0.5">
                <Link
                  href="/distribution/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-[#1E2552] hover:text-white"
                >
                  <User className="w-4 h-4 text-purple-400" />
                  <span>Distribution Settings</span>
                </Link>
                <Link
                  href="/admin/dashboard"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-[#1E2552] hover:text-white"
                >
                  <span className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Switch to HRMS Portal</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>
                <Link
                  href="/catalog"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-[#1E2552] hover:text-white"
                >
                  <span className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>Switch to Public Catalog</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>
              </div>

              <div className="mt-1 pt-1 border-t border-[#23294E]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
