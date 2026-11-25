'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { BarChart3, ArrowUpRight, Calendar } from 'lucide-react';

interface AnalyticsProps {
  analytics: {
    month: string;
    attendancePercentage: number;
    totalWorkingHours: number;
    presentDays: number;
    absentDays: number;
    lateArrivals: number;
    leaveDays: number;
    scheduledWorkingDays: number;
    weeklyHoursSeries: Array<{ label: string; date: string; hours: number; status: string }>;
    statusBreakdown: Array<{ name: string; value: number; color: string }>;
  };
  selectedMonth: string;
  onMonthChange: (newMonth: string) => void;
}

export default function EmployeeAttendanceAnalytics({
  analytics,
  selectedMonth,
  onMonthChange,
}: AnalyticsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const statPills = [
    { label: 'Attendance Rate', value: `${analytics.attendancePercentage}%`, tone: 'text-[#6538ED] bg-[#F6F5FF]' },
    { label: 'Present Days', value: analytics.presentDays, tone: 'text-[#12B886] bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Late Arrivals', value: analytics.lateArrivals, tone: 'text-[#F59E0B] bg-amber-50 dark:bg-amber-950/40' },
    { label: 'Leave Days', value: analytics.leaveDays, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { label: 'Absent Days', value: analytics.absentDays, tone: 'text-[#EF476F] bg-rose-50 dark:bg-rose-950/40' },
  ];

  return (
    <div className="enterprise-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#6538ED]" />
            <span>Attendance Analytics &amp; Weekly Hours</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Actual attendance metrics computed from verified punch records ({analytics.scheduledWorkingDays} working days tracked)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
            <Calendar className="h-3.5 w-3.5 text-[#6538ED]" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              aria-label="Filter attendance analytics month"
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            />
          </div>
          <Link
            href="/attendance/my-history"
            className="inline-flex items-center gap-1 rounded-xl border border-[#6538ED]/25 bg-[#F6F5FF] px-3 py-1.5 text-xs font-bold text-[#6538ED] hover:bg-[#EDE9FE] dark:bg-[#191C3A] dark:text-purple-300"
          >
            <span>Full History</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Stat Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {statPills.map((pill) => (
          <div
            key={pill.label}
            className={`rounded-2xl px-3 py-2.5 border border-slate-200/70 dark:border-slate-800 ${pill.tone}`}
          >
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{pill.label}</p>
            <p className="mt-0.5 text-lg font-extrabold">{pill.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
        {/* Chart 1: Weekly Working Hours */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Weekly Working Hours</h4>
            <span className="text-xs font-bold text-[#6538ED] dark:text-[#8255FF]">
              {analytics.totalWorkingHours} hrs total in range
            </span>
          </div>
          <div className="h-52 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weeklyHoursSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} unit="h" />
                  <Tooltip
                    formatter={(value: any) => [`${value} hrs`, 'Logged Hours']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                    contentStyle={{ borderRadius: 12, fontSize: 12, borderColor: '#E2E8F0' }}
                  />
                  <Bar dataKey="hours" fill="#6538ED" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
            )}
          </div>
        </div>

        {/* Chart 2: Monthly Status Breakdown */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Breakdown</h4>
            <span className="text-xs font-bold text-[#12B886]">
              {analytics.attendancePercentage}% Attendance
            </span>
          </div>
          <div className="h-52 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.statusBreakdown} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} width={82} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => [`${value} days`, 'Count']}
                    contentStyle={{ borderRadius: 12, fontSize: 12, borderColor: '#E2E8F0' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {analytics.statusBreakdown.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
