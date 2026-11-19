'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  Camera,
  RefreshCw,
  Building,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Compass,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminLiveAttendancePage() {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedPunchPhoto, setSelectedPunchPhoto] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'CHECKED_IN' | 'CHECKED_OUT' | 'ABSENT' | 'ON_LEAVE' | 'LATE' | 'EXCEPTIONS'>('CHECKED_IN');

  const fetchLiveMonitor = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (branchFilter) params.append('branchId', branchFilter);

      const [liveRes, branchRes] = await Promise.all([
        fetch(`/api/admin/attendance/live?${params.toString()}`),
        fetch('/api/branches'),
      ]);

      const liveJson = await liveRes.json();
      const branchJson = await branchRes.json();

      setData(liveJson);
      setBranches(branchJson.branches || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, branchFilter]);

  const [liveToast, setLiveToast] = useState<string | null>(null);

  useEffect(() => {
    fetchLiveMonitor();
    const interval = setInterval(fetchLiveMonitor, 15000); // 15s fallback poll

    // Real-Time Server-Sent Events (SSE) listener
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/admin/dashboard/live-stream');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ATTENDANCE_EVENT') {
            setLiveToast(`Live Update: ${payload.event.employeeName} (${payload.event.eventType.replace('_', ' ')})`);
            fetchLiveMonitor();
            setTimeout(() => setLiveToast(null), 5000);
          }
        } catch {}
      };
    } catch (err) {
      console.warn('SSE connection skipped:', err);
    }

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [fetchLiveMonitor]);

  const handleExceptionDecision = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const remark = prompt(`Enter ${action.toLowerCase()} remark:`) || '';
    try {
      const res = await fetch(`/api/attendance/exception/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewRemark: remark }),
      });

      if (res.ok) {
        fetchLiveMonitor();
      } else {
        const d = await res.json();
        alert(d.error || 'Decision failed');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Live Attendance & Geofence Monitor
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time verified employee check-ins, office geofence perimeters, and exception queues.
          </p>
        </div>

        {liveToast && (
          <div className="flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-500/25 animate-bounce">
            <CheckCircle2 className="h-4 w-4" />
            <span>{liveToast}</span>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-900"
          />

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <button
            onClick={fetchLiveMonitor}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div
          onClick={() => setActiveTab('CHECKED_IN')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeTab === 'CHECKED_IN'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Checked In Now</span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">
            {summary.currentlyCheckedInCount || 0}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">In Office</p>
        </div>

        <div
          onClick={() => setActiveTab('CHECKED_OUT')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeTab === 'CHECKED_OUT'
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Completed Shift</span>
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {summary.checkedOutCount || 0}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">Checked Out</p>
        </div>

        <div
          onClick={() => setActiveTab('LATE')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeTab === 'LATE'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
              : 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Late Arrivals</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600">
            {summary.lateArrivalsCount || 0}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">Grace Exceeded</p>
        </div>

        <div
          onClick={() => setActiveTab('ON_LEAVE')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeTab === 'ON_LEAVE'
              ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30'
              : 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>On Leave</span>
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-purple-600">
            {summary.onLeaveCount || 0}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">Approved Leaves</p>
        </div>

        <div
          onClick={() => setActiveTab('ABSENT')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeTab === 'ABSENT'
              ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
              : 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Absent</span>
            <UserX className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-600">
            {summary.absentCount || 0}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">Unaccounted</p>
        </div>

        <div
          onClick={() => setActiveTab('EXCEPTIONS')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeTab === 'EXCEPTIONS'
              ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30'
              : 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Exceptions Queue</span>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-orange-600">
            {summary.pendingExceptionsCount || 0}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">Awaiting Decision</p>
        </div>
      </div>

      {/* Interactive Map Visualizer */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Live Attendance Geographic Radar (Interactive Map)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Plotting {data?.officeLocations?.length || 0} Offices & {data?.currentlyCheckedIn?.length || 0} Punch Pins
          </span>
        </div>

        {/* Map Container */}
        <div className="relative mt-4 flex h-72 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-4">
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-60"></div>

          {/* Markers Presentation */}
          <div className="relative flex flex-wrap items-center justify-center gap-8 z-10">
            {(data?.officeLocations || []).map((off: any) => (
              <div key={off.id} className="flex flex-col items-center">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-emerald-400 bg-emerald-500/15">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                    <Building className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-2 rounded-lg bg-slate-900/90 px-3 py-1 text-center text-xs text-white border border-slate-800">
                  <span className="font-bold text-emerald-400">{off.name}</span>
                  <p className="text-[10px] text-slate-400">{off.radiusMeters}m geofence radius</p>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-3 right-3 rounded-lg bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-300 backdrop-blur">
            Active Geofence Boundaries Enforced
          </div>
        </div>
      </div>

      {/* Tabbed Workforce Lists */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('CHECKED_IN')}
            className={`border-b-2 px-6 py-4 text-xs font-bold transition-all ${
              activeTab === 'CHECKED_IN'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Currently Checked In ({summary.currentlyCheckedInCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('CHECKED_OUT')}
            className={`border-b-2 px-6 py-4 text-xs font-bold transition-all ${
              activeTab === 'CHECKED_OUT'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Checked Out Today ({summary.checkedOutCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('LATE')}
            className={`border-b-2 px-6 py-4 text-xs font-bold transition-all ${
              activeTab === 'LATE'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Late Arrivals ({summary.lateArrivalsCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('EXCEPTIONS')}
            className={`border-b-2 px-6 py-4 text-xs font-bold transition-all ${
              activeTab === 'EXCEPTIONS'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Exceptions Queue ({summary.pendingExceptionsCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('ABSENT')}
            className={`border-b-2 px-6 py-4 text-xs font-bold transition-all ${
              activeTab === 'ABSENT'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Absent Staff ({summary.absentCount || 0})
          </button>
        </div>

        {/* Tab 1: Checked In Stream */}
        {activeTab === 'CHECKED_IN' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Office & Branch</th>
                  <th className="px-5 py-3.5">Check-In Time</th>
                  <th className="px-5 py-3.5">GPS Distance</th>
                  <th className="px-5 py-3.5">Accuracy</th>
                  <th className="px-5 py-3.5">Selfie Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.currentlyCheckedIn || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No employees currently checked in.
                    </td>
                  </tr>
                ) : (
                  data.currentlyCheckedIn.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {r.employee.firstName} {r.employee.lastName}
                        <span className="block text-[11px] font-normal text-slate-400">
                          {r.employee.employeeCode} • {r.employee.department?.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {r.officeLocation?.name || r.employee.branch?.name}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                        {new Date(r.checkInTime).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                            r.checkInWithinGeofence
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          <MapPin className="h-3 w-3" />
                          {r.checkInDistanceMeters !== null
                            ? `${r.checkInDistanceMeters.toFixed(1)}m from office`
                            : 'GPS Locked'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">
                        ±{r.checkInAccuracy ? r.checkInAccuracy.toFixed(1) : 10}m
                      </td>
                      <td className="px-5 py-3.5">
                        {r.checkInPhoto ? (
                          <button
                            onClick={() => setSelectedPunchPhoto(r.checkInPhoto)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                          >
                            <Camera className="h-3.5 w-3.5 text-brand-600" />
                            <span>View Selfie</span>
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
        )}

        {/* Tab 2: Exceptions Queue */}
        {activeTab === 'EXCEPTIONS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Exception Reason</th>
                  <th className="px-5 py-3.5">Explanation / Note</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Review Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.pendingExceptions || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No pending attendance exceptions.
                    </td>
                  </tr>
                ) : (
                  data.pendingExceptions.map((ex: any) => (
                    <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {ex.employee?.firstName} {ex.employee?.lastName}
                        <span className="block text-[11px] font-normal text-slate-400">
                          {ex.employee?.employeeCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                          {ex.reason.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {ex.explanation}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{ex.exceptionDate}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleExceptionDecision(ex.id, 'APPROVE')}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                          >
                            Approve Exception
                          </button>
                          <button
                            onClick={() => handleExceptionDecision(ex.id, 'REJECT')}
                            className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Completed Shifts */}
        {activeTab === 'CHECKED_OUT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">In Time</th>
                  <th className="px-5 py-3.5">Out Time</th>
                  <th className="px-5 py-3.5">Hours</th>
                  <th className="px-5 py-3.5">Overtime</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.checkedOut || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No employees checked out yet today.
                    </td>
                  </tr>
                ) : (
                  data.checkedOut.map((r: any) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {r.employee.firstName} {r.employee.lastName}
                      </td>
                      <td className="px-5 py-3.5">{new Date(r.checkInTime).toLocaleTimeString()}</td>
                      <td className="px-5 py-3.5">{new Date(r.checkOutTime).toLocaleTimeString()}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {r.totalHours} hrs
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-brand-600">
                        {r.overtimeHours > 0 ? `+${r.overtimeHours} hrs` : '--'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Late Arrivals */}
        {activeTab === 'LATE' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Check-In Time</th>
                  <th className="px-5 py-3.5">Late Minutes</th>
                  <th className="px-5 py-3.5">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.lateArrivals || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                      No late arrivals recorded today.
                    </td>
                  </tr>
                ) : (
                  data.lateArrivals.map((r: any) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {r.employee.firstName} {r.employee.lastName}
                      </td>
                      <td className="px-5 py-3.5">{new Date(r.checkInTime).toLocaleTimeString()}</td>
                      <td className="px-5 py-3.5 font-bold text-amber-600">+{r.lateMinutes} mins late</td>
                      <td className="px-5 py-3.5 text-slate-500">{r.employee.department?.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Absent Staff */}
        {activeTab === 'ABSENT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Branch</th>
                  <th className="px-5 py-3.5">Designation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.absentEmployees || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                      All active employees have punched attendance or are on approved leave.
                    </td>
                  </tr>
                ) : (
                  data.absentEmployees.map((e: any) => (
                    <tr key={e.id}>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {e.firstName} {e.lastName}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{e.department?.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{e.branch?.name}</td>
                      <td className="px-5 py-3.5 text-slate-500">{e.designation}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selfie Photograph Modal */}
      {selectedPunchPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Live Punch Selfie</span>
              <button onClick={() => setSelectedPunchPhoto(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <img src={selectedPunchPhoto} alt="Live selfie" className="h-64 w-full rounded-2xl object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}
