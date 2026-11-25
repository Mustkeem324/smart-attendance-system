'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUi } from '@/components/providers/UiProvider';
import {
  History,
  Filter,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  MapPin,
  Calendar,
  X,
  Edit3,
} from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useUi();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [correctingRecord, setCorrectingRecord] = useState<any | null>(null);
  const [correctionForm, setCorrectionForm] = useState({ checkIn: '', checkOut: '', reason: '' });
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/attendance/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleExport = (format: 'xlsx' | 'csv') => {
    const params = new URLSearchParams();
    if (dateFilter) params.append('date', dateFilter);
    params.append('format', format);
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;

    try {
      const res = await fetch('/api/attendance/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceRecordId: correctingRecord.id,
          checkInTime: correctionForm.checkIn ? new Date(correctionForm.checkIn).toISOString() : undefined,
          checkOutTime: correctionForm.checkOut ? new Date(correctionForm.checkOut).toISOString() : undefined,
          reason: correctionForm.reason,
          isDirectAdminCorrection: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || ''),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Correction applied successfully');
        toast.success(data.message || 'Attendance correction applied.');
        setCorrectingRecord(null);
        fetchRecords();
      } else {
        toast.error(data.error || 'Failed to submit correction');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = records.filter((r) => {
    if (!search) return true;
    const name = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
    const code = (r.employee?.employeeCode || '').toLowerCase();
    return name.includes(search.toLowerCase()) || code.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Attendance Log & Punch Records
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time biometric attendance records with GPS coordinates and live selfie audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand-600 dark:border-slate-800 dark:bg-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="EARLY_DEPARTURE">Early Departure</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="ABSENT">Absent</option>
          </select>

          {(dateFilter || statusFilter || search) && (
            <button
              onClick={() => {
                setDateFilter('');
                setStatusFilter('');
                setSearch('');
              }}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Department & Branch</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Check In</th>
                <th className="px-5 py-3.5">Check Out</th>
                <th className="px-5 py-3.5">Hours</th>
                <th className="px-5 py-3.5">GPS Geofence</th>
                <th className="px-5 py-3.5">Selfie</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-slate-400">
                    Loading attendance records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-slate-400">
                    No attendance records found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                      {record.date}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {record.employee?.employeeCode}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      <div>{record.employee?.department?.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {record.employee?.branch?.name}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          record.status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : record.status === 'LATE'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : record.status === 'HALF_DAY'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : record.status === 'ON_LEAVE'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : record.status === 'PENDING_APPROVAL'
                            ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700 dark:text-slate-300">
                      {record.checkInTime ? (
                        <div>
                          <span className="font-medium">
                            {new Date(record.checkInTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {record.lateMinutes > 0 && (
                            <span className="ml-1.5 text-[10px] font-bold text-amber-600">
                              +{record.lateMinutes}m late
                            </span>
                          )}
                        </div>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700 dark:text-slate-300">
                      {record.checkOutTime ? (
                        <div>
                          <span className="font-medium">
                            {new Date(record.checkOutTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {record.earlyDepartureMinutes > 0 && (
                            <span className="ml-1.5 text-[10px] font-bold text-purple-600">
                              -{record.earlyDepartureMinutes}m early
                            </span>
                          )}
                        </div>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                      {record.totalHours ? `${record.totalHours} hrs` : '--'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {record.checkInDistanceMeters !== null && record.checkInDistanceMeters !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${
                            record.checkInWithinGeofence
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                          }`}
                        >
                          <MapPin className="h-3 w-3" />
                          {record.checkInDistanceMeters.toFixed(1)}m from office
                        </span>
                      ) : (
                        <span className="text-slate-400">Manual / Off</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {record.checkInPhoto ? (
                        <button
                          onClick={() => setSelectedPhoto(record.checkInPhoto)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Camera className="h-3 w-3 text-brand-600" />
                          <span>View Photo</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">No Photo</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setCorrectingRecord(record);
                          setCorrectionForm({
                            checkIn: record.checkInTime ? new Date(record.checkInTime).toISOString().slice(0, 16) : '',
                            checkOut: record.checkOutTime ? new Date(record.checkOutTime).toISOString().slice(0, 16) : '',
                            reason: '',
                          });
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="Edit / Correct Punch"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selfie Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 ">
          <div className="relative max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Live Attendance Selfie Photograph
              </span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={selectedPhoto}
              alt="Attendance verification selfie"
              className="h-64 w-full rounded-2xl object-cover"
            />
            <div className="mt-3 text-center text-[11px] text-slate-400">
              Captured via live browser front camera at punch submission.
            </div>
          </div>
        </div>
      )}

      {/* Attendance Correction Modal */}
      {correctingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 ">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Correct Attendance Punch
                </h3>
                <p className="text-[11px] text-slate-400">
                  {correctingRecord.employee?.firstName} {correctingRecord.employee?.lastName} (
                  {correctingRecord.date})
                </p>
              </div>
              <button
                onClick={() => setCorrectingRecord(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Adjusted Check In Time
                </label>
                <input
                  type="datetime-local"
                  value={correctionForm.checkIn}
                  onChange={(e) =>
                    setCorrectionForm({ ...correctionForm, checkIn: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Adjusted Check Out Time
                </label>
                <input
                  type="datetime-local"
                  value={correctionForm.checkOut}
                  onChange={(e) =>
                    setCorrectionForm({ ...correctionForm, checkOut: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Correction Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionForm.reason}
                  onChange={(e) =>
                    setCorrectionForm({ ...correctionForm, reason: e.target.value })
                  }
                  placeholder="e.g. Employee punch missed due to on-site client meeting..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectingRecord(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-700"
                >
                  Submit Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
