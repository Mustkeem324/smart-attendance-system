'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import GPSStatusBadge from '@/components/GPSStatusBadge';
import LiveCameraModal from '@/components/LiveCameraModal';
import { PageHeader, StatusBadge } from '@/components/ui/EnterpriseUI';
import { useEmployeeAttendanceActions } from '@/hooks/useEmployeeAttendanceActions';
import {
  Clock,
  CheckCircle2,
  LogOut,
  LogIn,
  AlertCircle,
  Calendar,
  Hourglass,
  Camera,
  Coffee,
  ShieldAlert,
  LayoutDashboard,
  History,
  MapPin,
} from 'lucide-react';

export default function EmployeeAttendancePunchPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [breakState, setBreakState] = useState<{ activeBreak: any; totalMinutes: number }>({
    activeBreak: null,
    totalMinutes: 0,
  });

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = useCallback(async () => {
    try {
      const [todayRes, breakRes] = await Promise.all([
        fetch('/api/attendance/today'),
        fetch('/api/attendance/break'),
      ]);
      if (todayRes.ok) {
        setTodayData(await todayRes.json());
      }
      if (breakRes.ok) {
        const json = await breakRes.json();
        setBreakState({
          activeBreak: json.activeBreak || null,
          totalMinutes: Number(json.totalMinutes) || 0,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  const {
    setCurrentGps,
    isCameraModalOpen,
    setIsCameraModalOpen,
    cameraModalMode,
    submitting,
    breakLoading,
    feedback,
    openCheckIn,
    openCheckOut,
    submitPunchPhoto,
    toggleBreak,
  } = useEmployeeAttendanceActions({ onSuccess: fetchTodayStatus });

  const branch = todayData?.branch || user?.employee?.branch;
  const shift = todayData?.shift || user?.employee?.shift;
  const record = todayData?.record;
  const isCheckedIn = Boolean(record?.checkInTime);
  const isCheckedOut = Boolean(record?.checkOutTime);

  let elapsedHours = '--';
  if (isCheckedIn && record?.checkInTime && currentTime) {
    const endMs = record.checkOutTime ? new Date(record.checkOutTime).getTime() : currentTime.getTime();
    const diffMs = Math.max(0, endMs - new Date(record.checkInTime).getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    elapsedHours = `${hours}h ${mins}m`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance & Punch"
        subtitle="Record GPS-verified and live-camera check-in / check-out punches and manage shift breaks."
        eyebrow="Time & Geofence Attendance"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/employee/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-[#6538ED]" />
              <span>Employee Dashboard</span>
            </Link>
            <Link
              href="/attendance/my-history"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#6538ED] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#562BD4]"
            >
              <History className="h-3.5 w-3.5" />
              <span>Attendance History</span>
            </Link>
          </div>
        }
      />

      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <p>{feedback.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* GPS Location Telemetry */}
        <div className="lg:col-span-5 space-y-6">
          <GPSStatusBadge
            officeLat={branch?.latitude ?? 28.6139}
            officeLon={branch?.longitude ?? 77.209}
            allowedRadiusMeters={branch?.radiusMeters ?? 100}
            officeName={branch?.name || 'Headquarters Branch'}
            onLocationUpdate={(loc) => setCurrentGps(loc)}
          />

          {shift && (
            <div className="enterprise-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Shift &amp; Branch</span>
                <StatusBadge status={record?.status || 'NOT_CHECKED_IN'} />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Shift Window</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {shift.name} ({shift.startTime} – {shift.endTime})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Work Branch</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#6538ED]" />
                    {branch?.name || 'Headquarters'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Punch Card */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-6 dark:border-slate-800 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {currentTime
                  ? currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                  : 'Loading date...'}
              </span>
              <h2 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
                {currentTime
                  ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '--:--:--'}
              </h2>
            </div>

            {record?.status && <StatusBadge status={record.status} />}
          </div>

          <div className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-[#F6F5FF] p-4 dark:bg-slate-800/50">
            <div className="text-center border-r border-slate-200 dark:border-slate-700 pr-2">
              <span className="text-[11px] font-medium text-slate-400">Check In</span>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {record?.checkInTime
                  ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </p>
            </div>
            <div className="text-center sm:border-r border-slate-200 dark:border-slate-700 pr-2">
              <span className="text-[11px] font-medium text-slate-400">Check Out</span>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {record?.checkOutTime
                  ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </p>
            </div>
            <div className="text-center border-r border-slate-200 dark:border-slate-700 pr-2">
              <span className="text-[11px] font-medium text-slate-400">Working Hours</span>
              <p className="mt-1 text-base font-bold text-[#6538ED] dark:text-[#8255FF]">
                {isCheckedOut ? `${record.totalHours}h` : isCheckedIn ? elapsedHours : '--'}
              </p>
            </div>
            <div className="text-center">
              <span className="text-[11px] font-medium text-slate-400">Break Time</span>
              <p className="mt-1 text-base font-bold text-amber-600 dark:text-amber-400">
                {breakState.totalMinutes || record?.totalBreakMinutes || 0}m
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading attendance status...</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {!isCheckedIn ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={openCheckIn}
                    className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-[#6538ED] px-6 py-4 text-sm font-bold text-white shadow-xl shadow-[#6538ED]/25 transition hover:bg-[#562BD4] disabled:opacity-50"
                  >
                    <LogIn className="h-5 w-5" />
                    <span>{submitting ? 'Submitting Punch...' : 'Punch In with Camera & GPS'}</span>
                  </button>
                ) : !isCheckedOut ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={openCheckOut}
                    className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-[#EF476F] px-6 py-4 text-sm font-bold text-white shadow-xl shadow-rose-500/20 transition hover:bg-rose-600 disabled:opacity-50"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>{submitting ? 'Recording...' : 'Punch Out for the Day'}</span>
                  </button>
                ) : (
                  <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-4 text-sm font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Daily Attendance Complete ({record.totalHours} hrs logged)</span>
                  </div>
                )}

                {isCheckedIn && !isCheckedOut && (
                  <button
                    type="button"
                    disabled={breakLoading}
                    onClick={() => toggleBreak(Boolean(breakState.activeBreak))}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-xs font-bold transition ${
                      breakState.activeBreak
                        ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    } disabled:opacity-50`}
                  >
                    <Coffee className="h-4 w-4 text-amber-600" />
                    <span>{breakLoading ? 'Updating...' : breakState.activeBreak ? 'End Break' : 'Start Break'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs">
                <Link
                  href="/attendance/my-history"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <Calendar className="h-3.5 w-3.5 text-[#6538ED]" />
                  <span>My History</span>
                </Link>
                <Link
                  href="/attendance/exceptions"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                  <span>Exceptions</span>
                </Link>
                <Link
                  href="/shifts"
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <Hourglass className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Shift Roster</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selfie Evidence Section */}
      {record && (record.checkInPhoto || record.checkOutPhoto) && (
        <div className="enterprise-card p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <Camera className="h-4 w-4 text-[#6538ED]" />
            Today&apos;s Live Verification Snapshots
          </h3>
          <div className="flex flex-wrap gap-4">
            {record.checkInPhoto && (
              <div className="space-y-1">
                <img src={record.checkInPhoto} alt="Check-in selfie" className="h-24 w-24 rounded-2xl object-cover border border-slate-200" />
                <p className="text-[11px] text-slate-500 font-medium text-center">Check-In</p>
              </div>
            )}
            {record.checkOutPhoto && (
              <div className="space-y-1">
                <img src={record.checkOutPhoto} alt="Check-out selfie" className="h-24 w-24 rounded-2xl object-cover border border-slate-200" />
                <p className="text-[11px] text-slate-500 font-medium text-center">Check-Out</p>
              </div>
            )}
          </div>
        </div>
      )}

      <LiveCameraModal
        isOpen={isCameraModalOpen}
        title={cameraModalMode === 'CHECK_IN' ? 'Check-In Live Selfie Verification' : 'Check-Out Photo Verification'}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={submitPunchPhoto}
      />
    </div>
  );
}
