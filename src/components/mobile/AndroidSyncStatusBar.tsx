'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { getOfflineQueue, syncPendingVisits } from '@/lib/offline-sync-engine';

export default function AndroidSyncStatusBar() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const updateStatus = () => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const queue = getOfflineQueue();
      const pending = queue.filter(
        (i) => i.status === 'SAVED_OFFLINE' || i.status === 'WAITING_TO_SYNC' || i.status === 'SYNC_FAILED'
      );
      setPendingCount(pending.length);
    }
  };

  useEffect(() => {
    updateStatus();

    const handleOnline = () => {
      setIsOnline(true);
      // Automatically attempt sync when coming back online
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    const handleQueueChanged = () => {
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('apex_offline_queue_changed', handleQueueChanged);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('apex_offline_queue_changed', handleQueueChanged);
    };
  }, []);

  const triggerSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback('Syncing offline data with server...');

    try {
      const res = await syncPendingVisits();
      if (res.synced > 0) {
        setSyncFeedback(`Successfully synchronized ${res.synced} offline visit(s)!`);
        setTimeout(() => setSyncFeedback(null), 4000);
      } else if (res.failed > 0) {
        setSyncFeedback(`Sync error on ${res.failed} item(s). Will retry.`);
        setTimeout(() => setSyncFeedback(null), 4000);
      } else {
        setSyncFeedback(null);
      }
    } catch (err: any) {
      setSyncFeedback(err.message || 'Sync failed');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
      updateStatus();
    }
  };

  // Only display if offline, pending drafts exist, syncing, or feedback is active
  if (isOnline && pendingCount === 0 && !isSyncing && !syncFeedback) {
    return null;
  }

  return (
    <div
      className={`w-full px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors shadow-sm ${
        !isOnline
          ? 'bg-amber-600/90 text-white'
          : isSyncing
          ? 'bg-indigo-600 text-white'
          : syncFeedback
          ? 'bg-emerald-600 text-white'
          : 'bg-[#151A38] text-amber-300 border-b border-amber-500/30'
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span className="truncate">Working Offline — {pendingCount} visit draft(s) saved locally</span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
            <span className="truncate">Synchronizing {pendingCount} offline draft(s)...</span>
          </>
        ) : syncFeedback ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{syncFeedback}</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="truncate">{pendingCount} offline visit(s) waiting to sync</span>
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && !isSyncing && (
        <button
          onClick={triggerSync}
          className="ml-2 shrink-0 rounded-lg bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white transition"
        >
          Sync Now
        </button>
      )}
    </div>
  );
}
