'use client';

import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, RefreshCw, Radio, Search, ExternalLink } from 'lucide-react';
import { useLiveNotifications } from '@/components/notifications/LiveNotificationContext';

export default function DistributionNotificationsPage() {
  const { liveMode, setLiveMode, liveStatus, openNotification, markAllRead } = useLiveNotifications();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [search, setSearch] = useState('');

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/notifications');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/v1/notifications/mark-read', { method: 'PUT' });
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenItem = async (raw: any) => {
    setNotifications((prev) => prev.map((n) => (n._id === raw._id ? { ...n, isRead: true } : n)));
    await openNotification({
      id: `dist-${String(raw._id)}`,
      title: raw.title,
      message: raw.message,
      type: raw.type === 'STOCK' ? 'WARNING' : raw.type === 'ORDER' ? 'SUCCESS' : 'INFO',
      category: raw.type === 'STOCK' ? 'INVENTORY' : raw.type === 'ORDER' ? 'ORDER' : 'SYSTEM',
      priority: raw.type === 'STOCK' ? 'HIGH' : 'NORMAL',
      isRead: Boolean(raw.isRead),
      link: raw.link || '/distribution',
      actionLabel: 'Open Distribution View',
      actorName: 'Distribution Telemetry',
      details: { AlertType: raw.type || 'SYSTEM', RoleScope: raw.recipientRole || 'ALL' },
      source: 'DISTRIBUTION',
      createdAt: raw.createdAt,
    });
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD' && n.isRead) return false;
    if (filter === 'READ' && !n.isRead) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (n.title || '').toLowerCase().includes(q) || (n.message || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-400" />
            <span>Distribution Live Notifications</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time alerts for stock thresholds, sales orders, deliveries, and payment collections — click any item for full details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLiveMode(!liveMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              liveMode
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-[#151A38] border-[#23294E] text-slate-400'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${liveMode && liveStatus === 'LIVE' ? 'animate-pulse' : ''}`} />
            <span>{liveMode ? 'Live Mode ON' : 'Paused'}</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-1.5 rounded-xl bg-[#6538ED] hover:bg-[#562BD4] text-white text-xs font-semibold transition-all"
          >
            Mark All Read
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(['ALL', 'UNREAD', 'READ'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                filter === tab
                  ? 'bg-[#6538ED] text-white'
                  : 'bg-[#151A38] text-slate-400 border border-[#23294E]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter alerts..."
            className="w-full rounded-xl bg-[#151A38] border border-[#23294E] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#6538ED]"
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 rounded-2xl bg-[#151A38] border border-[#23294E]">
            No matching notifications in inbox.
          </div>
        ) : (
          filtered.map((n) => (
            <button
              key={n._id}
              type="button"
              onClick={() => handleOpenItem(n)}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 hover:border-purple-400 ${
                !n.isRead
                  ? 'bg-[#181E45] border-purple-500/40 shadow-lg'
                  : 'bg-[#151A38] border-[#23294E] opacity-75'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  {n.type === 'STOCK' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : n.type === 'ORDER' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Bell className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />}
                    <h3 className="font-semibold text-white text-xs">{n.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    <span className="inline-flex items-center gap-1 text-purple-300 font-semibold">
                      Inspect &amp; Mark Read <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
