'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MyAttendanceHistoryPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/my-history?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setSummary(data.summary || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            My Personal Attendance History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review your verified punch records, GPS distances, working hours, and monthly summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400">Present Days</span>
          <div className="mt-1 text-2xl font-extrabold text-emerald-600">
            {summary.presentDays || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">In {month}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400">Late Punches</span>
          <div className="mt-1 text-2xl font-extrabold text-amber-600">
            {summary.lateDays || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Grace exceeded</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400">Half Days</span>
          <div className="mt-1 text-2xl font-extrabold text-purple-600">
            {summary.halfDays || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">&lt; 4.5 hours</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400">Total Working Hours</span>
          <div className="mt-1 text-2xl font-extrabold text-brand-600 dark:text-brand-400">
            {summary.totalWorkingHours || 0} hrs
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Cumulative</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400">Overtime Hours</span>
          <div className="mt-1 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            +{summary.totalOvertimeHours || 0} hrs
          </div>
          <p className="mt-1 text-[11px] text-slate-400">&gt; 8.0h threshold</p>
        </div>
      </div>

      {/* History Records Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Detailed Punch Log for {month}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Check In</th>
                <th className="px-5 py-3.5">Check Out</th>
                <th className="px-5 py-3.5">Working Duration</th>
                <th className="px-5 py-3.5">GPS Geofence Distance</th>
                <th className="px-5 py-3.5">Selfie Photo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Loading attendance records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    No attendance records logged for {month}.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {r.date}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          r.status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : r.status === 'LATE'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : r.status === 'HALF_DAY'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {r.checkInTime ? (
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {r.lateMinutes > 0 && (
                            <span className="ml-1 text-[10px] text-amber-600 font-bold">
                              (+{r.lateMinutes}m late)
                            </span>
                          )}
                        </div>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {r.checkOutTime ? (
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {r.earlyDepartureMinutes > 0 && (
                            <span className="ml-1 text-[10px] text-purple-600 font-bold">
                              (-{r.earlyDepartureMinutes}m early)
                            </span>
                          )}
                        </div>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-bold text-brand-600 dark:text-brand-400">
                      {r.totalHours ? `${r.totalHours} hrs` : '--'}
                      {r.overtimeHours > 0 && (
                        <span className="ml-1.5 text-[10px] font-bold text-emerald-600">
                          (+{r.overtimeHours}h OT)
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {r.checkInDistanceMeters !== null && r.checkInDistanceMeters !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${
                            r.checkInWithinGeofence
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          <MapPin className="h-3 w-3" />
                          {r.checkInDistanceMeters.toFixed(1)}m from office
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {r.checkInPhoto ? (
                        <button
                          onClick={() => setSelectedPhoto(r.checkInPhoto)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                        >
                          <Camera className="h-3 w-3 text-brand-600" />
                          <span>View Photo</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">No Photo</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selfie Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Live Punch Selfie</span>
              <button onClick={() => setSelectedPhoto(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <img src={selectedPhoto} alt="Live selfie" className="h-64 w-full rounded-2xl object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}
