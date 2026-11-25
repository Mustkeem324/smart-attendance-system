'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useLiveNotifications } from '@/components/notifications/LiveNotificationContext';
import { PageHeader, StatusBadge, EmptyState, SkeletonCards } from '@/components/ui/EnterpriseUI';
import type { RichNotificationItem } from '@/lib/notifications';
import {
  Bell,
  Radio,
  Volume2,
  VolumeX,
  BellRing,
  Search,
  Check,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Info,
  ExternalLink,
} from 'lucide-react';

const CATEGORIES = [
  'ALL',
  'ATTENDANCE',
  'LEAVE',
  'TASK',
  'ANNOUNCEMENT',
  'SUPPORT',
  'ORDER',
  'INVENTORY',
  'SECURITY',
  'SYSTEM',
] as const;

export default function NotificationCenterView({
  scope = 'PERSONAL',
  title = 'Live Notification Center',
  subtitle = 'Real-time workspace alerts, actionable approvals, and live delivery status — click any notification to view full details.',
}: {
  scope?: 'PERSONAL' | 'ORG';
  title?: string;
  subtitle?: string;
}) {
  const {
    notifications: liveList,
    liveMode,
    setLiveMode,
    liveStatus,
    soundEnabled,
    setSoundEnabled,
    browserAlertsEnabled,
    enableBrowserAlerts,
    lastSyncedAt,
    refreshNotifications,
    openNotification,
    markNotificationRead,
    markAllRead,
    dismissNotification,
    clearRead,
  } = useLiveNotifications();

  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'URGENT' | 'READ'>('ALL');
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [scopedList, setScopedList] = useState<RichNotificationItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScoped = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('scope', scope);
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setScopedList(d.notifications || []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchScoped();
    refreshNotifications({ scope });
  }, [fetchScoped, refreshNotifications, scope]);

  // Merge live updates with org-scoped list seamlessly
  const baseList: RichNotificationItem[] =
    scope === 'ORG' && scopedList
      ? scopedList.map((item) => {
          const liveMatch = liveList.find((l) => l.id === item.id);
          return liveMatch ? { ...item, isRead: liveMatch.isRead } : item;
        })
      : liveList.length > 0
      ? liveList
      : scopedList || [];

  const unreadCount = baseList.filter((n) => !n.isRead).length;
  const urgentCount = baseList.filter(
    (n) => !n.isRead && (n.priority === 'URGENT' || n.type === 'ALERT' || n.type === 'WARNING')
  ).length;

  const visibleList = baseList.filter((n) => {
    if (filterTab === 'UNREAD' && n.isRead) return false;
    if (filterTab === 'READ' && !n.isRead) return false;
    if (filterTab === 'URGENT' && n.priority !== 'URGENT' && n.type !== 'ALERT' && n.type !== 'WARNING') return false;
    if (category !== 'ALL' && n.category !== category) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.actorName.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleRowClick = async (item: RichNotificationItem) => {
    setScopedList((prev) =>
      prev ? prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)) : prev
    );
    await openNotification(item);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        eyebrow="Live Notifications & Alerts"
        badge={
          <StatusBadge variant={liveStatus === 'LIVE' ? 'success' : liveStatus === 'CONNECTING' ? 'warning' : 'neutral'} pulse={liveStatus === 'LIVE'}>
            {liveStatus === 'LIVE' ? 'LIVE STREAM' : liveStatus}
          </StatusBadge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLiveMode(!liveMode)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                liveMode
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Radio className={`h-3.5 w-3.5 ${liveMode ? 'animate-pulse text-[#12B886]' : ''}`} />
              <span>{liveMode ? 'Live Mode: ON' : 'Live Mode: PAUSED'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title="Toggle subtle notification audio chime"
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                soundEnabled
                  ? 'border-[#6538ED]/30 bg-[#F6F5FF] text-[#6538ED]'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={() => enableBrowserAlerts()}
              title="Enable browser desktop alerts"
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                browserAlertsEnabled
                  ? 'border-[#6538ED]/30 bg-[#F6F5FF] text-[#6538ED]'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <BellRing className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{browserAlertsEnabled ? 'Push ON' : 'Desktop Alerts'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await fetchScoped();
                await refreshNotifications({ scope });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      />

      {/* Live Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="enterprise-card p-4">
          <p className="text-[11px] font-semibold text-slate-500">Total Messages</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{baseList.length}</p>
          <p className="text-[10px] text-slate-400">
            {lastSyncedAt ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Syncing...'}
          </p>
        </div>
        <div className="enterprise-card p-4 border-[#6538ED]/25">
          <p className="text-[11px] font-semibold text-[#6538ED]">Unread Messages</p>
          <p className="mt-1 text-2xl font-extrabold text-[#6538ED]">{unreadCount}</p>
          <p className="text-[10px] text-slate-400">Click any notification to inspect &amp; read</p>
        </div>
        <div className="enterprise-card p-4 border-rose-200/80 dark:border-rose-900/40">
          <p className="text-[11px] font-semibold text-[#EF476F]">Urgent &amp; Warnings</p>
          <p className="mt-1 text-2xl font-extrabold text-[#EF476F]">{urgentCount}</p>
          <p className="text-[10px] text-slate-400">High-priority operational alerts</p>
        </div>
        <div className="enterprise-card p-4 flex flex-col justify-between gap-2">
          <p className="text-[11px] font-semibold text-slate-500">Quick Bulk Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await markAllRead();
                setScopedList((prev) => (prev ? prev.map((n) => ({ ...n, isRead: true })) : prev));
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-[#6538ED] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#562BD4]"
            >
              <Check className="h-3 w-3" /> Mark All Read
            </button>
            <button
              type="button"
              onClick={async () => {
                await clearRead();
                setScopedList((prev) => (prev ? prev.filter((n) => !n.isRead) : prev));
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              <Trash2 className="h-3 w-3" /> Clear Read
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="enterprise-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'UNREAD', 'URGENT', 'READ'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  filterTab === tab
                    ? 'bg-[#6538ED] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, full message, sender..."
              className="enterprise-input pl-9 py-2 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                category === cat
                  ? 'bg-[#15172B] text-white dark:bg-[#8255FF]'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="enterprise-card overflow-hidden">
        {loading && baseList.length === 0 ? (
          <div className="p-5">
            <SkeletonCards count={4} />
          </div>
        ) : visibleList.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Bell}
              title="No matching notifications"
              description="Real-time alerts for attendance, leaves, tasks, support tickets, and security appear here automatically."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleList.map((n) => {
              const isAlert = n.type === 'ALERT' || n.priority === 'URGENT';
              const isWarning = n.type === 'WARNING' || n.priority === 'HIGH';
              const isSuccess = n.type === 'SUCCESS';
              const Icon = isAlert
                ? ShieldAlert
                : isWarning
                ? AlertTriangle
                : isSuccess
                ? CheckCircle2
                : Info;

              return (
                <div
                  key={n.id}
                  onClick={() => handleRowClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(n);
                    }
                  }}
                  className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 cursor-pointer transition hover:bg-[#F6F5FF]/70 dark:hover:bg-white/5 ${
                    !n.isRead ? 'bg-[#F6F5FF]/50 dark:bg-[#6538ED]/10' : 'opacity-85'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                        isAlert
                          ? 'bg-rose-500/10 text-[#EF476F] border-rose-500/20'
                          : isWarning
                          ? 'bg-amber-500/10 text-[#F59E0B] border-amber-500/20'
                          : isSuccess
                          ? 'bg-emerald-500/10 text-[#12B886] border-emerald-500/20'
                          : 'bg-[#6538ED]/10 text-[#6538ED] border-[#6538ED]/20'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-[#6538ED] animate-pulse shrink-0" />}
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#6538ED] transition">
                          {n.title}
                        </h3>
                        <StatusBadge variant="purple">{n.category}</StatusBadge>
                        {n.priority === 'URGENT' && <StatusBadge variant="danger">URGENT</StatusBadge>}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                        <span>{n.actorName}</span>
                        <span>•</span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                        {n.link && (
                          <span className="inline-flex items-center gap-1 font-bold text-[#6538ED]">
                            Click for full details &amp; action <ExternalLink className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                    {!n.id.startsWith('sys-') && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            const next = !n.isRead;
                            setScopedList((prev) =>
                              prev ? prev.map((x) => (x.id === n.id ? { ...x, isRead: next } : x)) : prev
                            );
                            await markNotificationRead(n.id, next);
                          }}
                          className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300"
                          title={n.isRead ? 'Mark as unread' : 'Mark as read'}
                        >
                          {n.isRead ? 'Unread' : 'Mark Read'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setScopedList((prev) => (prev ? prev.filter((x) => x.id !== n.id) : prev));
                            await dismissNotification(n.id);
                          }}
                          className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Dismiss"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
