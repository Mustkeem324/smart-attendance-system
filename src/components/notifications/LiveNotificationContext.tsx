'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';
import type { RichNotificationItem } from '@/lib/notifications';
import NotificationDetailModal from '@/components/notifications/NotificationDetailModal';

export type LiveStreamStatus = 'LIVE' | 'CONNECTING' | 'PAUSED' | 'OFFLINE';

interface LiveNotificationContextValue {
  notifications: RichNotificationItem[];
  unreadCount: number;
  urgentCount: number;
  liveMode: boolean;
  setLiveMode: (enabled: boolean) => void;
  liveStatus: LiveStreamStatus;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  browserAlertsEnabled: boolean;
  enableBrowserAlerts: () => Promise<boolean>;
  loading: boolean;
  lastSyncedAt: string | null;
  refreshNotifications: (options?: { scope?: 'PERSONAL' | 'ORG' }) => Promise<void>;
  openNotification: (notification: RichNotificationItem) => Promise<void>;
  markNotificationRead: (id: string, isRead?: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  clearRead: () => Promise<void>;
}

const LiveNotificationContext = createContext<LiveNotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  urgentCount: 0,
  liveMode: true,
  setLiveMode: () => {},
  liveStatus: 'OFFLINE',
  soundEnabled: false,
  setSoundEnabled: () => {},
  browserAlertsEnabled: false,
  enableBrowserAlerts: async () => false,
  loading: false,
  lastSyncedAt: null,
  refreshNotifications: async () => {},
  openNotification: async () => {},
  markNotificationRead: async () => {},
  markAllRead: async () => {},
  dismissNotification: async () => {},
  clearRead: async () => {},
});

export function useLiveNotifications() {
  return useContext(LiveNotificationContext);
}

function playSubtleChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {}
}

export function LiveNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useUi();

  const [notifications, setNotifications] = useState<RichNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [liveMode, setLiveModeState] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveStreamStatus>('OFFLINE');
  const [loading, setLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<RichNotificationItem | null>(null);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);
  const browserAlertsRef = useRef(browserAlertsEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    browserAlertsRef.current = browserAlertsEnabled;
  }, [browserAlertsEnabled]);

  // Restore saved preferences cleanly after mount
  useEffect(() => {
    try {
      const savedLive = localStorage.getItem('se_live_notifications');
      if (savedLive === 'false') setLiveModeState(false);
      const savedSound = localStorage.getItem('se_notif_sound');
      if (savedSound === 'true') setSoundEnabledState(true);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setBrowserAlertsEnabled(localStorage.getItem('se_notif_browser') !== 'false');
      }
    } catch {}
  }, []);

  const setLiveMode = (enabled: boolean) => {
    setLiveModeState(enabled);
    try {
      localStorage.setItem('se_live_notifications', String(enabled));
    } catch {}
    if (!enabled) setLiveStatus('PAUSED');
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem('se_notif_sound', String(enabled));
    } catch {}
    if (enabled) playSubtleChime();
  };

  const enableBrowserAlerts = async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') {
      const next = !browserAlertsEnabled;
      setBrowserAlertsEnabled(next);
      try {
        localStorage.setItem('se_notif_browser', String(next));
      } catch {}
      return next;
    }
    const perm = await Notification.requestPermission();
    const granted = perm === 'granted';
    setBrowserAlertsEnabled(granted);
    try {
      localStorage.setItem('se_notif_browser', String(granted));
    } catch {}
    return granted;
  };

  const announceIncoming = useCallback(
    (incomingList: RichNotificationItem[]) => {
      if (!initializedRef.current) {
        incomingList.forEach((n) => seenIdsRef.current.add(n.id));
        initializedRef.current = true;
        return;
      }

      const brandNew = incomingList.filter(
        (n) => !n.isRead && !n.id.startsWith('sys-') && !seenIdsRef.current.has(n.id)
      );
      incomingList.forEach((n) => seenIdsRef.current.add(n.id));

      if (brandNew.length > 0) {
        const latest = brandNew[0];
        if (latest.type === 'ALERT') {
          toast.error(`${latest.title}: ${latest.message.slice(0, 120)}`);
        } else if (latest.type === 'WARNING') {
          toast.warning(`${latest.title}: ${latest.message.slice(0, 120)}`);
        } else if (latest.type === 'SUCCESS') {
          toast.success(`${latest.title}: ${latest.message.slice(0, 120)}`);
        } else {
          toast.info(`${latest.title}: ${latest.message.slice(0, 120)}`);
        }

        if (soundEnabledRef.current) {
          playSubtleChime();
        }

        if (
          browserAlertsRef.current &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          try {
            const nativeNotif = new Notification(latest.title, { body: latest.message });
            nativeNotif.onclick = () => {
              window.focus();
              setSelectedNotification(latest);
            };
          } catch {}
        }
      }
    },
    [toast]
  );

  const refreshNotifications = useCallback(
    async (options?: { scope?: 'PERSONAL' | 'ORG' }) => {
      if (!user) return;
      setLoading(true);
      try {
        const qs = options?.scope ? `?scope=${options.scope}` : '';
        const res = await fetch(`/api/notifications${qs}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.notifications) ? data.notifications : [];
          setNotifications(list);
          setUnreadCount(Number(data.unreadCount) || 0);
          setUrgentCount(Number(data.urgentCount) || 0);
          setLastSyncedAt(new Date().toISOString());
          announceIncoming(list);
        }
      } catch {}
      finally {
        setLoading(false);
      }
    },
    [user, announceIncoming]
  );

  // SSE Live Stream subscription
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setUrgentCount(0);
      setLiveStatus('OFFLINE');
      initializedRef.current = false;
      seenIdsRef.current.clear();
      return;
    }

    if (!liveMode) {
      setLiveStatus('PAUSED');
      refreshNotifications();
      return;
    }

    let es: EventSource | null = null;
    let active = true;

    const connect = () => {
      if (!active || typeof EventSource === 'undefined') return;
      setLiveStatus('CONNECTING');
      es = new EventSource('/api/notifications/stream');

      const handlePayload = (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data);
          setLiveStatus('LIVE');
          if (Array.isArray(payload.notifications)) {
            setNotifications(payload.notifications);
            setUnreadCount(Number(payload.unreadCount) || 0);
            setUrgentCount(Number(payload.urgentCount) || 0);
            setLastSyncedAt(payload.timestamp || new Date().toISOString());
            announceIncoming(payload.notifications);
          }
        } catch {}
      };

      es.addEventListener('init', handlePayload);
      es.addEventListener('update', handlePayload);
      es.addEventListener('heartbeat', (ev: MessageEvent) => {
        setLiveStatus('LIVE');
        try {
          const p = JSON.parse(ev.data);
          if (typeof p.unreadCount === 'number') setUnreadCount(p.unreadCount);
          setLastSyncedAt(new Date().toISOString());
        } catch {}
      });

      es.onerror = () => {
        if (!active) return;
        setLiveStatus('CONNECTING');
      };
    };

    connect();

    return () => {
      active = false;
      if (es) es.close();
    };
  }, [user, liveMode, announceIncoming, refreshNotifications]);

  const markNotificationRead = async (id: string, isRead: boolean = true) => {
    // Optimistic update
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, isRead } : n));
      setUnreadCount(next.filter((n) => !n.isRead).length);
      return next;
    });
    setSelectedNotification((prev) => (prev && prev.id === id ? { ...prev, isRead } : prev));

    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead }),
      });
    } catch {}
  };

  /**
   * Clicking any notification immediately marks it as read AND opens its full interactive detail view.
   */
  const openNotification = async (notification: RichNotificationItem) => {
    const markedItem = { ...notification, isRead: true };
    setSelectedNotification(markedItem);
    if (!notification.isRead) {
      await markNotificationRead(notification.id, true);
    }
    // Fetch fresh rich details if available
    if (!notification.id.startsWith('sys-')) {
      try {
        const res = await fetch(`/api/notifications/${encodeURIComponent(notification.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.notification) {
            setSelectedNotification((cur) =>
              cur && cur.id === notification.id ? { ...data.notification, isRead: true } : cur
            );
          }
        }
      } catch {}
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    setUrgentCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      toast.success('All notifications marked as read.');
    } catch {}
  };

  const dismissNotification = async (id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      setUnreadCount(next.filter((n) => !n.isRead).length);
      return next;
    });
    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast.success('Notification dismissed.');
    } catch {}
  };

  const clearRead = async () => {
    setNotifications((prev) => prev.filter((n) => !n.isRead));
    try {
      await fetch('/api/notifications?clearRead=true', { method: 'DELETE' });
      toast.success('Cleared read notifications.');
    } catch {}
  };

  return (
    <LiveNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        urgentCount,
        liveMode,
        setLiveMode,
        liveStatus,
        soundEnabled,
        setSoundEnabled,
        browserAlertsEnabled,
        enableBrowserAlerts,
        loading,
        lastSyncedAt,
        refreshNotifications,
        openNotification,
        markNotificationRead,
        markAllRead,
        dismissNotification,
        clearRead,
      }}
    >
      {children}
      <NotificationDetailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onToggleRead={markNotificationRead}
        onDismiss={dismissNotification}
      />
    </LiveNotificationContext.Provider>
  );
}
