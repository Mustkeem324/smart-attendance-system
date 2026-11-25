'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';
import { useLiveNotifications } from '@/components/notifications/LiveNotificationContext';
import Modal from './Modal';
import EmployeePhotoUploadModal, { saveOwnProfilePhoto } from '@/components/employees/EmployeePhotoUploadModal';
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
  Camera,
  Radio,
} from 'lucide-react';
import PlatformModeSwitcher from '@/components/mobile/PlatformModeSwitcher';

export default function Navbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useUi();
  const {
    notifications,
    unreadCount,
    liveMode,
    setLiveMode,
    liveStatus,
    openNotification,
    markAllRead,
  } = useLiveNotifications();
  const [isDark, setIsDark] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Reflect the theme applied by the pre-hydration script in layout.tsx
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [copilotData, setCopilotData] = useState<any>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

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

  const isElevatedNotificationsUser =
    user?.role && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER'].includes(user.role);

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
          <MapPin className="h-3.5 w-3.5 text-[#6538ED]" />
          <select
            value={selectedBranch}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedBranch(val);
              try {
                sessionStorage.setItem('se_selected_branch', val);
                window.dispatchEvent(new CustomEvent('se:branch-changed', { detail: val }));
              } catch {}
            }}
            aria-label="Global branch filter"
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
          className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-[#6538ED] hover:text-[#6538ED] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
          title="Mobile Field & Attendance App"
        >
          <Smartphone className="h-3.5 w-3.5 text-[#6538ED]" />
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

        {/* Operations Copilot Button */}
        <button
          type="button"
          onClick={() => {
            setShowAiModal(true);
            setCopilotLoading(true);
            fetch('/api/admin/dashboard/overview')
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => {
                if (d) setCopilotData(d);
              })
              .catch(() => {})
              .finally(() => setCopilotLoading(false));
          }}
          className="flex items-center gap-1.5 rounded-2xl bg-[#6538ED] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-[#6538ED]/25 transition hover:bg-[#562BD4]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Live Briefing</span>
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
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Live Notifications</span>
                  <button
                    type="button"
                    onClick={() => setLiveMode(!liveMode)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      liveMode && liveStatus === 'LIVE'
                        ? 'bg-emerald-500/15 text-[#12B886]'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                    title="Toggle real-time live notification stream"
                  >
                    <Radio className={`h-2.5 w-2.5 ${liveMode && liveStatus === 'LIVE' ? 'animate-pulse' : ''}`} />
                    <span>{liveMode ? (liveStatus === 'LIVE' ? 'LIVE' : 'SYNC') : 'PAUSED'}</span>
                  </button>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead()}
                    className="text-[11px] font-bold text-[#6538ED] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">No active notifications</div>
                ) : (
                  notifications.slice(0, 12).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={async () => {
                        setShowNotifications(false);
                        await openNotification(n);
                      }}
                      className={`w-full text-left py-2.5 px-2 rounded-xl my-0.5 text-xs transition hover:bg-[#F6F5FF] dark:hover:bg-white/5 ${
                        n.isRead ? 'opacity-65' : 'bg-[#F6F5FF]/60 font-medium dark:bg-[#6538ED]/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{n.title}</p>
                        {n.type === 'ALERT' || n.type === 'WARNING' ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400 line-clamp-2">{n.message}</p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-semibold text-[#6538ED]">Click for details →</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-slate-100 pt-2.5 text-center dark:border-slate-800">
                <Link
                  href={isElevatedNotificationsUser ? '/admin/notifications' : '/notifications'}
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-bold text-[#6538ED] hover:underline"
                >
                  Open Live Notification Center →
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
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              title="Add or update your professional profile photo"
              aria-label="Add or update your professional profile photo"
              className="group relative flex h-9 w-9 items-center justify-center rounded-2xl bg-[#6538ED]/10 text-xs font-black text-[#6538ED] overflow-hidden shrink-0 border border-[#6538ED]/25 hover:border-[#6538ED] uppercase transition"
            >
              {user.employee?.profilePhoto || user.profilePhoto ? (
                <img
                  src={user.employee?.profilePhoto || user.profilePhoto || ''}
                  alt={user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email}
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  {user.employee
                    ? `${user.employee.firstName?.[0] || ''}${user.employee.lastName?.[0] || ''}`
                    : user.email.slice(0, 2)}
                </>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-[#15172B]/65 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </button>
            <div className="hidden text-left lg:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {user.employee
                    ? `${user.employee.firstName} ${user.employee.lastName}`
                    : user.email.split('@')[0]}
                </span>
                <span className="rounded-md bg-[#6538ED]/10 px-1.5 py-0.2 text-[9px] font-extrabold text-[#6538ED] dark:text-purple-300">
                  {user.role?.replace(/_/g, ' ') || 'USER'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(true)}
                className="text-[10px] font-medium text-slate-400 hover:text-[#6538ED] dark:text-slate-400 dark:hover:text-purple-300 transition"
              >
                {user.employee?.profilePhoto || user.profilePhoto ? 'Update my photo' : 'Add own photo'} • {user.email}
              </button>
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

      {/* Live Workforce Briefing Modal */}
      <Modal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        title="Executive Operations Briefing"
        description="Live workspace summary across attendance, leaves, and exceptions"
        maxWidthClass="max-w-lg"
        panelClassName="p-6"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAiModal(false)}
              className="rounded-xl bg-[#6538ED] px-4 py-2 text-xs font-bold text-white hover:bg-[#562BD4]"
            >
              Done
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-2 rounded-2xl bg-purple-50/60 p-4 text-xs dark:bg-white/5">
            <p className="font-bold text-[#6538ED] dark:text-purple-300">Today&apos;s Live Operational Snapshot</p>
            {copilotLoading ? (
              <p className="text-slate-500 dark:text-slate-400 py-2">Loading live workforce metrics...</p>
            ) : copilotData?.kpis ? (
              <ul className="list-inside list-disc space-y-1.5 text-slate-700 dark:text-slate-300">
                <li>
                  <span className="font-semibold">{copilotData.kpis.presentToday ?? 0}</span> of{' '}
                  <span className="font-semibold">{copilotData.kpis.totalEmployees ?? 0}</span> staff present today ({copilotData.kpis.attendancePercentage ?? 0}% turnout).
                </li>
                <li>
                  <span className="font-semibold">{copilotData.kpis.currentlyCheckedIn ?? 0}</span> active on shift and{' '}
                  <span className="font-semibold">{copilotData.kpis.lateArrivals ?? 0}</span> late arrival record(s).
                </li>
                <li>
                  <span className="font-semibold">{copilotData.kpis.onLeave ?? 0}</span> approved leave(s) and{' '}
                  <span className="font-semibold">{copilotData.kpis.pendingCorrections ?? 0}</span> pending exception(s) awaiting review.
                </li>
              </ul>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 py-2">
                Overview metrics are available to manager and HR accounts from the executive dashboard.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/admin/attendance/live"
              onClick={() => setShowAiModal(false)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-center text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#6538ED]"
            >
              Live Monitor
            </Link>
            <Link
              href="/attendance/exceptions"
              onClick={() => setShowAiModal(false)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-center text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#6538ED]"
            >
              Exceptions
            </Link>
            <Link
              href="/reports"
              onClick={() => setShowAiModal(false)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-center text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#6538ED]"
            >
              Export Reports
            </Link>
          </div>
        </div>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Salman Enterprises Support & Documentation"
        description="Enterprise Operations Helpdesk"
        maxWidthClass="max-w-md"
        panelClassName="p-6"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="rounded-xl bg-[#6538ED] px-4 py-2 text-xs font-bold text-white hover:bg-[#562BD4]"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p>
            Welcome to the <strong>Salman Enterprises Business Workspace</strong> covering Workforce, Field Sales, and B2B Distribution operations.
          </p>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5 space-y-1">
            <p className="font-bold text-slate-800 dark:text-white">Direct Enterprise Support:</p>
            <p>Email: <span className="text-[#6538ED] font-semibold">contact@salmanenterprises.in</span></p>
            <p>Phone: <span className="font-semibold">+91 (080) 4129-8800</span></p>
            <p>Operating Hours: Monday – Saturday (9:00 AM – 7:00 PM IST)</p>
          </div>
        </div>
      </Modal>

      {user && (
        <EmployeePhotoUploadModal
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          isSelfService
          targetEmployeeId={user.employee?.id}
          targetUserId={user.id}
          currentPhoto={user.employee?.profilePhoto || user.profilePhoto || null}
          employeeName={
            user.employee
              ? `${user.employee.firstName} ${user.employee.lastName}`
              : user.email.split('@')[0]
          }
          onSave={async (photoUrl) => {
            const data = await saveOwnProfilePhoto(photoUrl);
            await refreshUser();
            toast.success(
              photoUrl
                ? `Professional photo saved in folder ${data.folder || 'your ID'}.`
                : 'Profile photo removed.'
            );
          }}
        />
      )}
    </header>
  );
}
