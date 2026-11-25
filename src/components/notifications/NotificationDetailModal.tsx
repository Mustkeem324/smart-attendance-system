'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { StatusBadge } from '@/components/ui/EnterpriseUI';
import type { RichNotificationItem } from '@/lib/notifications';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  ExternalLink,
  Check,
  Trash2,
  User,
  Info,
} from 'lucide-react';

interface NotificationDetailModalProps {
  notification: RichNotificationItem | null;
  onClose: () => void;
  onToggleRead: (id: string, isRead: boolean) => Promise<void> | void;
  onDismiss: (id: string) => Promise<void> | void;
}

export default function NotificationDetailModal({
  notification,
  onClose,
  onToggleRead,
  onDismiss,
}: NotificationDetailModalProps) {
  const router = useRouter();
  if (!notification) return null;

  const isAlert = notification.type === 'ALERT' || notification.priority === 'URGENT';
  const isWarning = notification.type === 'WARNING' || notification.priority === 'HIGH';
  const isSuccess = notification.type === 'SUCCESS';

  const Icon = isAlert
    ? ShieldAlert
    : isWarning
    ? AlertTriangle
    : isSuccess
    ? CheckCircle2
    : notification.type === 'INFO'
    ? Info
    : Bell;

  const iconBoxStyle = isAlert
    ? 'bg-rose-500/10 text-[#EF476F] border-rose-500/25'
    : isWarning
    ? 'bg-amber-500/10 text-[#F59E0B] border-amber-500/25'
    : isSuccess
    ? 'bg-emerald-500/10 text-[#12B886] border-emerald-500/25'
    : 'bg-[#6538ED]/10 text-[#6538ED] border-[#6538ED]/25';

  const detailEntries = Object.entries(notification.details || {});

  const handleNavigateAction = () => {
    const target = notification.link;
    onClose();
    if (target) {
      router.push(target);
    }
  };

  return (
    <Modal
      isOpen={Boolean(notification)}
      onClose={onClose}
      title="Notification Details"
      description={`${notification.category} alert • Complete message & contextual payload`}
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4">
        {/* Status Banner */}
        <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-[#F6F5FF]/70 p-4 dark:border-slate-800 dark:bg-[#15172B]">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${iconBoxStyle}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={notification.priority} />
              <StatusBadge variant="purple">{notification.category}</StatusBadge>
              <StatusBadge variant={notification.isRead ? 'success' : 'warning'}>
                {notification.isRead ? 'Read' : 'Unread'}
              </StatusBadge>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {notification.title}
            </h3>
          </div>
        </div>

        {/* Full Complete Message */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Full Message
          </p>
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
            {notification.message}
          </p>
        </div>

        {/* Sender & Timestamps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
            <User className="h-3.5 w-3.5 text-[#6538ED] shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">Triggered By</p>
              <p className="font-semibold text-slate-800 dark:text-white truncate">
                {notification.actorName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
            <Clock className="h-3.5 w-3.5 text-[#6538ED] shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">Received At</p>
              <p className="font-semibold text-slate-800 dark:text-white truncate">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Structured Metadata Grid */}
        {detailEntries.length > 0 && (
          <div className="rounded-2xl border border-slate-200/80 p-3.5 dark:border-slate-800 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Event Context &amp; Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {detailEntries.map(([key, val]) => (
                <div key={key} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">{key}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 break-words">
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {!notification.id.startsWith('sys-') && (
              <>
                <button
                  type="button"
                  onClick={() => onToggleRead(notification.id, !notification.isRead)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <Check className="h-3.5 w-3.5 text-[#12B886]" />
                  <span>{notification.isRead ? 'Mark Unread' : 'Mark Read'}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onDismiss(notification.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Dismiss</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              Close
            </button>
            {notification.link && (
              <button
                type="button"
                onClick={handleNavigateAction}
                className="enterprise-btn-primary text-xs inline-flex items-center gap-1.5"
              >
                <span>{notification.actionLabel || 'Take Action'}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
