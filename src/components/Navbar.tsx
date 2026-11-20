'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Modal from './Modal';
import {
  Bell,
  Search,
  User,
  LogOut,
  Sun,
  Moon,
  Menu,
  Building,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Command,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import PlatformModeSwitcher from '@/components/mobile/PlatformModeSwitcher';

export default function Navbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  // Reflect the theme applied by the pre-hydration script in layout.tsx
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Global Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Office Location Selector
  const [selectedBranch, setSelectedBranch] = useState('All Branches (HQ + Satellites)');

  useEffect(() => {
    if (user) {
      fetch('/api/admin/notifications')
        .then((r) => r.json())
        .then((d) => {
          if (d.notifications) setNotifications(d.notifications);
        })
        .catch(() => {});
    }
  }, [user]);

  // Keyboard shortcut Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global search effect
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/employees?search=${encodeURIComponent(searchQuery)}&limit=5`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.employees || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // Storage can be blocked in private browsing; the class toggle still applies
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-master-line bg-white/95 px-4 backdrop-blur dark:border-white/10 dark:bg-master-navy/95 lg:px-8">
      {/* Left: Mobile Toggle & Global Search Bar */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-slate-500 hover:bg-master-lavender dark:text-slate-300 dark:hover:bg-white/10 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Global Search Input with Cmd+K hint */}
        <div ref={searchRef} className="relative hidden w-72 sm:block md:w-96">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="Search employee, ID, shift, department..."
              className="w-full rounded-2xl border border-master-line bg-master-lavender/60 py-2 pl-9 pr-14 text-xs text-[#172033] transition-all focus:border-master-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-master-indigo/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-slate-800"
            />
            <div className="absolute right-2.5 top-2 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
              <Command className="h-2.5 w-2.5" /> K
            </div>
          </div>

          {/* Search Dropdown Results */}
          {showSearchDropdown && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 mt-2 z-50 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Search Results ({searchResults.length})
                </span>
                {isSearching && <span className="text-[10px] text-[#5428E8]">Searching...</span>}
              </div>

              {searchResults.length === 0 && !isSearching ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching employees or records found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {searchResults.map((emp) => (
                    <Link
                      key={emp.id}
                      href={`/employees/${emp.id}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="flex items-center justify-between rounded-xl px-2 py-2 transition hover:bg-master-lavender dark:hover:bg-white/10"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5428E8]/10 text-xs font-bold text-[#5428E8] overflow-hidden shrink-0">
                          {emp.profilePhoto ? (
                            <img
                              src={emp.profilePhoto}
                              alt={emp.firstName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <>{emp.firstName[0]}{emp.lastName[0]}</>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {emp.employeeCode} • {emp.department?.name || 'General'}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Office Location Selector */}
        <div className="hidden items-center gap-1.5 rounded-2xl border border-master-line bg-master-lavender/70 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 lg:flex">
          <MapPin className="h-3.5 w-3.5 text-[#5428E8]" />
          <span>{selectedBranch}</span>
        </div>
      </div>

      {/* Right Navigation Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-pressed={isDark}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-master-lavender hover:text-master-indigo dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* AI Assistant Button */}
        <button
          onClick={() => setShowAiModal(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-master-indigo to-brand-400 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-master-indigo/25 transition hover:opacity-95"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* Help Center */}
        <Link
          href="/settings"
          className="rounded-xl p-2 text-slate-500 transition hover:bg-master-lavender hover:text-master-indigo dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          title="Help & Documentation"
        >
          <HelpCircle className="h-4 w-4" />
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            aria-expanded={showNotifications}
            className="relative rounded-xl p-2 text-slate-500 transition hover:bg-master-lavender hover:text-master-indigo dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 z-50 w-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Admin Notification Center</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-bold text-[#5428E8] hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">No active notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`py-2 text-xs ${n.isRead ? 'opacity-65' : 'font-medium'}`}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                        {n.type === 'ALERT' || n.type === 'WARNING' ? (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        )}
                      </div>
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400">{n.message}</p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-slate-100 pt-2 text-center">
                <Link
                  href="/admin/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-bold text-[#5428E8] hover:underline"
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Badge */}
        <PlatformModeSwitcher />

        {user && (
          <div className="flex items-center gap-2.5 border-l border-master-line pl-3 dark:border-white/10">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-master-indigo/20 bg-master-indigo/10 text-xs font-black text-master-indigo dark:text-brand-300 overflow-hidden shrink-0">
              {user.employee?.profilePhoto ? (
                <img
                  src={user.employee.profilePhoto}
                  alt={user.employee.firstName}
                  className="h-full w-full object-cover"
                />
              ) : (
                user.employee ? `${user.employee.firstName[0]}${user.employee.lastName[0]}` : 'SA'
              )}
            </div>
            <div className="hidden text-left lg:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#172033] dark:text-white">
                  {user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email.split('@')[0]}
                </span>
                <span className="rounded-md bg-master-indigo/10 px-1.5 py-0.2 text-[9px] font-extrabold text-master-indigo dark:text-brand-300">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-[#8792AA] dark:text-slate-400">{user.employee?.designation || user.email}</p>
            </div>

            <button
              onClick={() => logout()}
              className="ml-1 rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* AI Assistant Modal */}
      <Modal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        title="SmartHRMS AI Copilot"
        description="Contextual workforce intelligence and biometric auditor"
        maxWidthClass="max-w-lg"
        panelClassName="p-6"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAiModal(false)}
              className="rounded-xl bg-master-indigo px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-2 rounded-2xl bg-master-lavender p-4 text-xs dark:bg-white/5">
            <p className="font-bold text-master-indigo dark:text-brand-300">✨ Daily Workforce Observations</p>
            <ul className="list-inside list-disc space-y-1 text-slate-700 dark:text-slate-300">
              <li>Engineering &amp; Development maintains 92% on-time arrival within 50m geofence.</li>
              <li>Overtime engine identified 3 eligible requests pending manager approval.</li>
              <li>Monthly payroll run for November 2026 is ready for review and disbursement.</li>
              <li>0 statutory deduction conflicts detected across active employees.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-100 p-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Type natural language queries like: <em>&quot;Who worked overtime this Friday?&quot;</em> or <em>&quot;Export 01-31 grid for Sales team&quot;</em>
          </div>
        </div>
      </Modal>
    </header>
  );
}
