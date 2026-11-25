'use client';

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useUi } from '@/components/providers/UiProvider';
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
  Building2,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Dynamic import for Leaflet OpenStreetMap component (SSR: false)
const LiveGeofenceMap = dynamic(() => import('@/components/maps/LiveGeofenceMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7138F5] border-t-transparent" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Loading OpenStreetMap Live Geofence Radar...
        </span>
      </div>
    </div>
  ),
});

export default function AdminLiveAttendancePage() {
  const { user } = useAuth();
  const { toast, prompt } = useUi();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedPunchPhoto, setSelectedPunchPhoto] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'CHECKED_IN' | 'CHECKED_OUT' | 'LATE' | 'ON_LEAVE' | 'ABSENT' | 'EXCEPTIONS'
  >('CHECKED_IN');

  const [tableSearch, setTableSearch] = useState('');
  const [liveToast, setLiveToast] = useState<string | null>(null);

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
    const remark = await prompt({
      title: `${action === 'APPROVE' ? 'Approve' : 'Reject'} Attendance Exception`,
      message: 'Provide an optional review remark recorded on the audit trail.',
      placeholder: `Enter ${action.toLowerCase()} remark...`,
      confirmText: action === 'APPROVE' ? 'Approve' : 'Reject',
    });
    if (remark === null) return;
    try {
      const res = await fetch(`/api/attendance/exception/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewRemark: remark }),
      });

      if (res.ok) {
        toast.success(`Attendance exception ${action.toLowerCase()}ed.`);
        fetchLiveMonitor();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Decision failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const summary = data?.summary || {};

  // Extract punch markers for map
  const punchMarkers = useMemo(() => {
    if (!data?.mapMarkers) return [];
    return data.mapMarkers.filter((m: any) => m.type === 'PUNCH');
  }, [data]);

  const officeLocations = useMemo(() => {
    return data?.officeLocations || [];
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Live Attendance &amp; Geofence Monitor
            </h1>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE FEED
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Real-time biometric punch tracking, OpenStreetMap geofence enforcement, and exception verification.
          </p>
        </div>

        {liveToast && (
          <div className="flex items-center gap-2 rounded-2xl bg-[#7138F5] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#7138F5]/30 animate-bounce">
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
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs outline-none transition focus:border-[#7138F5] dark:border-white/10 dark:bg-slate-900 dark:text-white"
          />

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs outline-none transition focus:border-[#7138F5] dark:border-white/10 dark:bg-slate-900 dark:text-white"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchLiveMonitor}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 6 VISUALLY DISTINCT KPI CARDS (Linear / Stripe Design) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Card 1: Checked In Now */}
        <div
          onClick={() => setActiveTab('CHECKED_IN')}
          className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            activeTab === 'CHECKED_IN'
              ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-md dark:border-emerald-500/80 dark:bg-emerald-950/30'
              : 'border-slate-200 bg-white shadow-xs hover:border-emerald-300 hover:shadow-sm dark:border-white/10 dark:bg-[#0F122B]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Checked In</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {summary.currentlyCheckedInCount || 0}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 dark:text-slate-500">Inside geofence</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">On Duty</span>
          </div>
        </div>

        {/* Card 2: Completed Shift */}
        <div
          onClick={() => setActiveTab('CHECKED_OUT')}
          className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            activeTab === 'CHECKED_OUT'
              ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-md dark:border-indigo-500/80 dark:bg-indigo-950/30'
              : 'border-slate-200 bg-white shadow-xs hover:border-indigo-300 hover:shadow-sm dark:border-white/10 dark:bg-[#0F122B]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {summary.checkedOutCount || 0}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 dark:text-slate-500">Shift concluded</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Logged Out</span>
          </div>
        </div>

        {/* Card 3: Late Arrivals */}
        <div
          onClick={() => setActiveTab('LATE')}
          className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            activeTab === 'LATE'
              ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-md dark:border-amber-500/80 dark:bg-amber-950/30'
              : 'border-slate-200 bg-white shadow-xs hover:border-amber-300 hover:shadow-sm dark:border-white/10 dark:bg-[#0F122B]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Late Arrivals</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-600 dark:text-amber-400">
            {summary.lateArrivalsCount || 0}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 dark:text-slate-500">Grace exceeded</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">&gt; 15 mins</span>
          </div>
        </div>

        {/* Card 4: On Leave */}
        <div
          onClick={() => setActiveTab('ON_LEAVE')}
          className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            activeTab === 'ON_LEAVE'
              ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20 shadow-md dark:border-purple-500/80 dark:bg-purple-950/30'
              : 'border-slate-200 bg-white shadow-xs hover:border-purple-300 hover:shadow-sm dark:border-white/10 dark:bg-[#0F122B]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">On Leave</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-purple-600 dark:text-purple-400">
            {summary.onLeaveCount || 0}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 dark:text-slate-500">Approved leaves</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">Excused</span>
          </div>
        </div>

        {/* Card 5: Absent */}
        <div
          onClick={() => setActiveTab('ABSENT')}
          className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            activeTab === 'ABSENT'
              ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20 shadow-md dark:border-rose-500/80 dark:bg-rose-950/30'
              : 'border-slate-200 bg-white shadow-xs hover:border-rose-300 hover:shadow-sm dark:border-white/10 dark:bg-[#0F122B]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Absent</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-rose-600 dark:text-rose-400">
            {summary.absentCount || 0}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 dark:text-slate-500">Unaccounted</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">Pending</span>
          </div>
        </div>

        {/* Card 6: Exceptions Queue */}
        <div
          onClick={() => setActiveTab('EXCEPTIONS')}
          className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            activeTab === 'EXCEPTIONS'
              ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-md dark:border-orange-500/80 dark:bg-orange-950/30'
              : 'border-slate-200 bg-white shadow-xs hover:border-orange-300 hover:shadow-sm dark:border-white/10 dark:bg-[#0F122B]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Exceptions</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/80 dark:text-orange-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-orange-600 dark:text-orange-400">
            {summary.pendingExceptionsCount || 0}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 dark:text-slate-500">Outside boundary</span>
            <span className="font-bold text-orange-600 dark:text-orange-400">Action Req</span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE GEOFENCE MONITORING (Genuine Leaflet OpenStreetMap) */}
      <LiveGeofenceMap
        officeLocations={officeLocations}
        punchMarkers={punchMarkers}
      />

      {/* RECENT EMPLOYEE CHECK-INS & ACTIVITY PANEL */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0F122B]">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('CHECKED_IN')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-xs font-bold transition-all ${
              activeTab === 'CHECKED_IN'
                ? 'border-[#7138F5] text-[#7138F5] dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <span>Currently Checked In</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {summary.currentlyCheckedInCount || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CHECKED_OUT')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-xs font-bold transition-all ${
              activeTab === 'CHECKED_OUT'
                ? 'border-[#7138F5] text-[#7138F5] dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <span>Completed Shifts</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {summary.checkedOutCount || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('LATE')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-xs font-bold transition-all ${
              activeTab === 'LATE'
                ? 'border-[#7138F5] text-[#7138F5] dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <span>Late Arrivals</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              {summary.lateArrivalsCount || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('EXCEPTIONS')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-xs font-bold transition-all ${
              activeTab === 'EXCEPTIONS'
                ? 'border-[#7138F5] text-[#7138F5] dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <span>Exceptions Queue</span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
              {summary.pendingExceptionsCount || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ON_LEAVE')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-xs font-bold transition-all ${
              activeTab === 'ON_LEAVE'
                ? 'border-[#7138F5] text-[#7138F5] dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <span>On Leave</span>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              {summary.onLeaveCount || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ABSENT')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-xs font-bold transition-all ${
              activeTab === 'ABSENT'
                ? 'border-[#7138F5] text-[#7138F5] dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <span>Absent Staff</span>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              {summary.absentCount || 0}
            </span>
          </button>
        </div>

        {/* Tab 1: Checked In Stream */}
        {activeTab === 'CHECKED_IN' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Office &amp; Branch</th>
                  <th className="px-5 py-3.5">Check-In Time</th>
                  <th className="px-5 py-3.5">Geofence Distance</th>
                  <th className="px-5 py-3.5">GPS Accuracy</th>
                  <th className="px-5 py-3.5 text-right">Selfie Biometric</th>
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
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 shrink-0">
                            {r.employee.firstName[0]}{r.employee.lastName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {r.employee.firstName} {r.employee.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {r.employee.employeeCode} &bull; {r.employee.department?.name || 'Operations'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        {r.officeLocation?.name || r.employee.branch?.name || 'Central Hub'}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            r.checkInWithinGeofence
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-500/20'
                          }`}
                        >
                          <MapPin className="h-3 w-3" />
                          {r.checkInDistanceMeters !== null
                            ? `${r.checkInDistanceMeters.toFixed(0)}m from office`
                            : 'Inside boundary'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                        &plusmn;{r.checkInAccuracy ? r.checkInAccuracy.toFixed(1) : 10}m
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.checkInPhoto ? (
                          <button
                            onClick={() => setSelectedPunchPhoto(r.checkInPhoto)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Camera className="h-3.5 w-3.5 text-[#7138F5]" />
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

        {/* Tab 2: Completed Shifts */}
        {activeTab === 'CHECKED_OUT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Check-In Time</th>
                  <th className="px-5 py-3.5">Check-Out Time</th>
                  <th className="px-5 py-3.5">Total Hours</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.checkedOut || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No employees checked out yet today.
                    </td>
                  </tr>
                ) : (
                  data.checkedOut.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shrink-0">
                            {r.employee.firstName[0]}{r.employee.lastName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {r.employee.firstName} {r.employee.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {r.employee.employeeCode} &bull; {r.employee.department?.name || 'Operations'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        {new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                        {r.totalHours} hrs
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-500/20 dark:bg-emerald-950/60 dark:text-emerald-300">
                          COMPLETED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Late Arrivals */}
        {activeTab === 'LATE' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-850 dark:text-slate-400">
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
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {r.employee.firstName} {r.employee.lastName}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {r.employee.employeeCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">{new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-5 py-3.5 font-bold text-amber-600 dark:text-amber-400">
                        +{r.lateMinutes} mins late
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{r.employee.department?.name || 'Operations'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Exceptions Queue */}
        {activeTab === 'EXCEPTIONS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Exception Reason</th>
                  <th className="px-5 py-3.5">Incident Explanation</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Review Action</th>
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
                    <tr key={ex.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {ex.employee?.firstName} {ex.employee?.lastName}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {ex.employee?.employeeCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-700 border border-orange-500/20 dark:bg-orange-950/60 dark:text-orange-300">
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
                            className="rounded-xl bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleExceptionDecision(ex.id, 'REJECT')}
                            className="rounded-xl bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition dark:bg-rose-950/60 dark:text-rose-300"
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

        {/* Tab 5: On Leave */}
        {activeTab === 'ON_LEAVE' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Leave Type</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-5 py-3.5">Period</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.onLeaveRequests || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No employees on approved leave today.
                    </td>
                  </tr>
                ) : (
                  data.onLeaveRequests.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {l.employee?.firstName} {l.employee?.lastName}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {l.employee?.employeeCode} &bull; {l.employee?.department?.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-purple-600 dark:text-purple-400">
                        {l.leaveType?.name || 'Casual Leave'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{l.reason}</td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(l.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-500/20 dark:bg-purple-950/60 dark:text-purple-300">
                          APPROVED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 6: Absent Staff */}
        {activeTab === 'ABSENT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Branch</th>
                  <th className="px-5 py-3.5">Designation</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.absentEmployees || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      All active employees have punched attendance or are on approved leave.
                    </td>
                  </tr>
                ) : (
                  data.absentEmployees.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {e.firstName} {e.lastName}
                        <span className="block text-[10px] font-normal text-slate-400">{e.employeeCode}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{e.department?.name || 'Operations'}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{e.branch?.name || 'Central'}</td>
                      <td className="px-5 py-3.5 text-slate-500">{e.designation}</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-500/20 dark:bg-rose-950/60 dark:text-rose-300">
                          UNPUNCHED
                        </span>
                      </td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
          <div className="max-w-sm w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Verified Biometric Selfie</span>
              <button
                onClick={() => setSelectedPunchPhoto(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={selectedPunchPhoto}
              alt="Live selfie verification"
              className="h-64 w-full rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
            <div className="mt-3 text-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Facial Biometric Verified &amp; GPS Matched
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
