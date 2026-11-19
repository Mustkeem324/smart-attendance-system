'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Clock,
  Calendar,
  Shield,
  ArrowLeft,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [employee, setEmployee] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/employees/${id}`)
        .then((r) => r.json())
        .then((d) => setEmployee(d.employee))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        Employee record not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/employees"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-xs text-slate-400">
            {employee.employeeCode} • {employee.designation}
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-100 text-2xl font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              {employee.firstName[0]}
              {employee.lastName[0]}
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{employee.designation}</p>
            <span className="mt-2 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {employee.employmentStatus}
            </span>
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>{employee.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{employee.phone || 'No phone recorded'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>{employee.department?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{employee.branch?.name} ({employee.branch?.radiusMeters}m geofence)</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{employee.shift?.name} ({employee.shift?.startTime} - {employee.shift?.endTime})</span>
            </div>
          </div>
        </div>

        {/* Leave Balances & Details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Current Year Leave Balances
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(employee.leaveBalances || []).map((b: any) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <span className="text-[11px] font-semibold text-slate-500">
                    {b.leaveType?.name}
                  </span>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                    {b.remainingDays}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Used: {b.usedDays} / {b.totalQuota}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Attendance History
            </h3>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {(employee.attendanceRecords || []).length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No recent punches.</p>
              ) : (
                employee.attendanceRecords.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">{r.date}</span>
                      <p className="text-[11px] text-slate-400">
                        In: {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '--'} • Out: {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '--'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {r.status}
                      </span>
                      <p className="text-[11px] text-slate-400">{r.totalHours ? `${r.totalHours} hrs` : '--'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
