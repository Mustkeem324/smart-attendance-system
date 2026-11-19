'use client';

import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      fetchNotifs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#23294E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-400" />
            Distribution Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational alerts for low warehouse stock, pending orders, and payment reconciliations.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3.5 py-1.5 rounded-xl bg-[#1E2552] hover:bg-[#28326D] text-white text-xs font-semibold border border-purple-500/30 transition-all"
        >
          Mark All Read
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 rounded-2xl bg-[#151A38] border border-[#23294E]">
            No notifications in inbox.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
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
                  <h3 className="font-semibold text-white text-xs">{n.title}</h3>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 block pt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
