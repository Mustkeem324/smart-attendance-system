'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Calendar,
  Clock,
  Filter,
  Check,
  ExternalLink,
} from 'lucide-react';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications?filter=${filter}`);
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Admin Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time compliance alerts, missing punches, approval requests, and system telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {(['ALL', 'UNREAD', 'READ'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
              filter === tab
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">No notifications</p>
            <p className="text-xs text-slate-400">All workforce actions and compliance alerts have been processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => {
              const isAlert = n.type === 'ALERT' || n.type === 'WARNING';
              return (
                <div
                  key={n.id}
                  className={`flex items-start justify-between p-5 transition-all ${
                    n.isRead ? 'bg-white opacity-75 dark:bg-slate-900' : 'bg-brand-50/20 dark:bg-brand-950/10'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        isAlert
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400'
                      }`}
                    >
                      {isAlert ? <AlertTriangle className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</h3>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-brand-600 animate-pulse"></span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {n.link && (
                          <Link
                            href={n.link}
                            className="inline-flex items-center gap-1 font-bold text-brand-600 hover:underline"
                          >
                            Take Action <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={() => markSingleRead(n.id)}
                      className="rounded-lg p-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
