'use client';

import React from 'react';
import { LucideIcon, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-[#E6E8F2] pb-4 dark:border-[#282D4F] sm:flex-row sm:items-center">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#6538ED] dark:text-[#8255FF]">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-extrabold tracking-tight text-[#15172B] dark:text-white sm:text-2xl">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

const STATUS_VARIANT_MAP: Record<string, 'success' | 'warning' | 'danger' | 'purple' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  PRESENT: 'success',
  APPROVED: 'success',
  COMPLETED: 'success',
  SUBMITTED: 'success',
  VERIFIED: 'success',
  RESOLVED: 'success',
  LATE: 'warning',
  PENDING: 'warning',
  IN_PROGRESS: 'warning',
  OPEN: 'warning',
  MEDIUM: 'warning',
  NOT_CHECKED_IN: 'neutral',
  ABSENT: 'danger',
  REJECTED: 'danger',
  TERMINATED: 'danger',
  HIGH: 'danger',
  URGENT: 'danger',
  OUTSIDE_GEOFENCE: 'danger',
  FLAGGED_MOCK_GPS: 'danger',
  ON_LEAVE: 'purple',
  HALF_DAY: 'purple',
  LOW: 'info',
  CLOSED: 'neutral',
};

export function StatusBadge({
  children,
  status,
  variant,
  pulse = false,
}: {
  children?: React.ReactNode;
  status?: string;
  variant?: 'success' | 'warning' | 'danger' | 'purple' | 'info' | 'neutral';
  pulse?: boolean;
}) {
  const normalizedStatus = status ? String(status).toUpperCase() : '';
  const resolvedVariant = variant || STATUS_VARIANT_MAP[normalizedStatus] || 'neutral';
  const displayContent = children ?? (status ? String(status).replace(/_/g, ' ') : '');

  const styles = {
    success: 'bg-[#12B886]/10 text-[#12B886] border-[#12B886]/25',
    warning: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25',
    danger: 'bg-[#EF476F]/10 text-[#EF476F] border-[#EF476F]/25',
    purple: 'bg-[#6538ED]/10 text-[#6538ED] dark:text-[#A78BFA] border-[#6538ED]/25',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/25',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 border-slate-200 dark:border-white/10',
  }[resolvedVariant];

  const dotColor = {
    success: 'bg-[#12B886]',
    warning: 'bg-[#F59E0B]',
    danger: 'bg-[#EF476F]',
    purple: 'bg-[#6538ED]',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
  }[resolvedVariant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles}`}
    >
      {pulse && <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${dotColor}`} />}
      {displayContent}
    </span>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E6E8F2] bg-white/70 px-6 py-14 text-center dark:border-[#282D4F] dark:bg-[#15172B]/60">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6538ED]/10 text-[#6538ED] dark:text-[#8255FF]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-[#15172B] dark:text-white">{title}</h3>
      <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {action ? (
        <div className="mt-4">{action}</div>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 enterprise-btn-primary text-xs"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="px-4 py-3.5">
              <div className="h-3.5 w-full rounded-md bg-slate-200/80 dark:bg-white/10" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="enterprise-card animate-pulse p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-white/10" />
          </div>
          <div className="h-7 w-20 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-2.5 w-32 rounded bg-slate-200 dark:bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (nextPage: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E6E8F2] px-5 py-3.5 text-xs dark:border-[#282D4F] sm:flex-row">
      <span className="text-slate-500 dark:text-slate-400">
        Page <strong className="text-[#15172B] dark:text-white">{page}</strong> of{' '}
        <strong className="text-[#15172B] dark:text-white">{totalPages}</strong> ({total} total records)
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="enterprise-btn-secondary px-3 py-1.5 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="enterprise-btn-secondary px-3 py-1.5 disabled:opacity-40"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
