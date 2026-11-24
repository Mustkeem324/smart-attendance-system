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
  Smartphone,
  ChevronDown,
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
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Global Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Office Location Selector
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetch('/api/admin/notifications')
        .then((r) => r.json())
        .then((d) => {
          if (d.notifications) setNotifications(d.notifications);
        })
        .catch(() => {});

      fetch('/api/branches')
        .then((r) => r.json())
        .then((d) => {
          if (d.branches) setBranches(d.branches);
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
        const res = await fetch(`/api/employees?search=${encodeURIComponent(searchQuery)}&limit=6`);
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

  // Close search & notification dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
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
    } catch {}
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
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md overflow-visible dark:border-white/10 dark:bg-[#0C0E22]/95 lg:px-8">
      {/* Left: Mobile Toggle & Global Search Bar & Branch Selector */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Global Search Input with Cmd+K shortcut */}
        <div ref={searchRef} className="relative hidden w-64 sm:block md:w-80 lg:w-96">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-14 text-xs text-slate-800 transition-all focus:border-[#7138F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7138F5]/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-slate-900"
            />
            <div className="absolute right-2.5 top-2 flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <Command className="h-2.5 w-2.5" /> K
            </div>
          </div>

          {/* Search Dropdown Results */}
          {showSearchDropdown && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 mt-2 z-50 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Search Results ({searchResults.length})
                </span>
                {isSearching && <span className="text-[10px] font-bold text-[#7138F5]">Searching...</span>}
              </div>

              {searchResults.length === 0 && !isSearching ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching employees or records found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto dark:divide-slate-800">
                  {searchResults.map((emp) => (
                    <Link
                      key={emp.id}
                      href={`/employees/${emp.id}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="flex items-center justify-between rounded-xl px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7138F5]/10 text-xs font-bold text-[#7138F5] overflow-hidden shrink-0">
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
                            {emp.employeeCode} • {emp.department?.name || 'Operations'}
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

        {/* Branch Selector Dropdown */}
        <div className="hidden items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 md:flex">
          <MapPin className="h-3.5 w-3.5 text-[#7138F5]" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-transparent font-medium focus:outline-none dark:bg-transparent dark:text-white"
          >
            <option value="ALL" className="dark:bg-slate-900 text-slate-800 dark:text-white">All Branches (HQ + Satellites)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} className="dark:bg-slate-900 text-slate-800 dark:text-white">
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Quick Tools, Theme, AI, Notifications, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile App Shortcut */}
        <Link
          href="/field-sales/mobile"
          className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-[#7138F5] hover:text-[#7138F5] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
          title="Mobile Attendance App"
        >
          <Smartphone className="h-3.5 w-3.5 text-[#7138F5]" />
          <span className="hidden md:inline">Mobile App</span>
        </Link>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* AI Assistant Button */}
        <button
          onClick={() => setShowAiModal(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-[#7138F5] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-[#7138F5]/25 transition hover:bg-[#6025e8]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* Help & Support */}
        <button
          onClick={() => setShowHelpModal(true)}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          title="Help & Support"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Notifications Dropdown with unclipped z-50 */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            aria-expanded={showNotifications}
            className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-[#0F122B]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Admin Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-bold text-[#7138F5] hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
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
              <div className="border-t border-slate-100 pt-2 text-center dark:border-slate-800">
                <Link
                  href="/admin/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-bold text-[#7138F5] hover:underline"
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Platform View Switcher */}
        <PlatformModeSwitcher />

        {/* User Profile & Role Badge */}
        {user && (
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3 dark:border-white/10">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#7138F5]/10 text-xs font-black text-[#7138F5] overflow-hidden shrink-0 border border-[#7138F5]/20">
              SE
            </div>
            <div className="hidden text-left lg:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Salman Enterprises
                </span>
                <span className="rounded-md bg-[#7138F5]/10 px-1.5 py-0.2 text-[9px] font-extrabold text-[#7138F5] dark:text-purple-300">
                  {user.role?.replace('_', ' ') || 'SUPER ADMIN'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400">{user.email}</p>
            </div>

            <button
              onClick={() => logout()}
              className="ml-1 rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition"
              title="Sign Out"
              aria-label="Sign out"
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
              className="rounded-xl bg-[#7138F5] px-4 py-2 text-xs font-bold text-white hover:bg-[#6025e8]"
            >
              Done
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-2 rounded-2xl bg-purple-50/60 p-4 text-xs dark:bg-white/5">
            <p className="font-bold text-[#7138F5] dark:text-purple-300">✨ Daily Workforce Observations</p>
            <ul className="list-inside list-disc space-y-1 text-slate-700 dark:text-slate-300">
              <li>Delhi Central Hub has 2 staff checked in within the 100m geofence perimeter.</li>
              <li>Noida DC has 1 staff completed shift and 1 staff currently on site (88m from center).</li>
              <li>1 staff (Bilal Qureshi) reported outside geofence roadblock exception (135m).</li>
              <li>Casual Leave approved for Rehan Shaikh today.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-100 p-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Type natural language commands: <em>&quot;Approve Bilal&apos;s geofence exception&quot;</em> or <em>&quot;Export attendance summary for North zone&quot;</em>
          </div>
        </div>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="SmartHRMS Support & Documentation"
        description="Salman Enterprises Enterprise Cloud Suite Helpdesk"
        maxWidthClass="max-w-md"
        panelClassName="p-6"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="rounded-xl bg-[#7138F5] px-4 py-2 text-xs font-bold text-white hover:bg-[#6025e8]"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p>
            Welcome to the <strong>SmartHRMS Enterprise Suite</strong> for Salman Enterprises B2B Distribution.
          </p>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5 space-y-1">
            <p className="font-bold text-slate-800 dark:text-white">Direct Enterprise Support:</p>
            <p>Email: <span className="text-[#7138F5] font-semibold">salmanenterprisesphu@gmail.com</span></p>
            <p>Phone: <span className="font-semibold">+91 9876543210</span></p>
            <p>Operating Hours: Monday – Saturday (9:00 AM – 7:00 PM IST)</p>
          </div>
        </div>
      </Modal>
    </header>
  );
}
