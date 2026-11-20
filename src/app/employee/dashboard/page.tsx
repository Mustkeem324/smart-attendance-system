'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import GPSStatusBadge from '@/components/GPSStatusBadge';
import LiveCameraModal from '@/components/LiveCameraModal';
import {
  Clock,
  MapPin,
  CheckCircle2,
  LogOut,
  LogIn,
  AlertCircle,
  Calendar,
  Hourglass,
  Camera,
  Coffee,
  Check,
  ShieldAlert,
} from 'lucide-react';

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraModalMode, setCameraModalMode] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [currentGps, setCurrentGps] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    isWithinGeofence: boolean;
  } | null>(null);
  const [punchFeedback, setPunchFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async () => {
    try {
      const res = await fetch('/api/attendance/today');
      if (res.ok) {
        const json = await res.json();
        setTodayData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  const handleOpenCheckIn = () => {
    setPunchFeedback(null);
    if (!currentGps) {
      setPunchFeedback({
        type: 'error',
        message: 'Acquiring GPS signal. Please wait a moment or click Refresh on the GPS badge.',
      });
      return;
    }
    setCameraModalMode('CHECK_IN');
    setIsCameraModalOpen(true);
  };

  const handleOpenCheckOut = () => {
    setPunchFeedback(null);
    setCameraModalMode('CHECK_OUT');
    setIsCameraModalOpen(true);
  };

  const handlePhotoCaptured = async (photoBase64: string) => {
    if (cameraModalMode === 'CHECK_IN') {
      await submitCheckIn(photoBase64);
    } else {
      await submitCheckOut(photoBase64);
    }
  };

  const submitCheckIn = async (photoBase64: string) => {
    setSubmitting(true);
    setPunchFeedback(null);
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: currentGps?.latitude,
          longitude: currentGps?.longitude,
          accuracy: currentGps?.accuracy,
          photo: photoBase64,
          allowException: true, // allow outside punch if approved
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPunchFeedback({ type: 'error', message: data.message || data.error || 'Check-in failed' });
      } else {
        setPunchFeedback({
          type: 'success',
          message: `Check-in recorded at ${new Date().toLocaleTimeString()}! Status: ${data.record.status}`,
        });
        await fetchTodayStatus();
      }
    } catch (err: any) {
      setPunchFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitCheckOut = async (photoBase64: string) => {
    setSubmitting(true);
    setPunchFeedback(null);
    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: currentGps?.latitude,
          longitude: currentGps?.longitude,
          accuracy: currentGps?.accuracy,
          photo: photoBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPunchFeedback({ type: 'error', message: data.message || data.error || 'Check-out failed' });
      } else {
        setPunchFeedback({
          type: 'success',
          message: `Check-out successful! Total logged hours: ${data.summary.totalHours} hrs.`,
        });
        await fetchTodayStatus();
      }
    } catch (err: any) {
      setPunchFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const branch = todayData?.branch || user?.employee?.branch;
  const shift = todayData?.shift || user?.employee?.shift;
  const record = todayData?.record;
  const isCheckedIn = Boolean(record?.checkInTime);
  const isCheckedOut = Boolean(record?.checkOutTime);

  // Compute live duration if checked in and not checked out
  let elapsedHours = '--';
  if (isCheckedIn && record?.checkInTime) {
    const diffMs = currentTime.getTime() - new Date(record.checkInTime).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    elapsedHours = `${hours}h ${mins}m`;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl overflow-hidden border-2 border-brand-500 shadow-md bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
            {user?.employee?.profilePhoto ? (
              <img
                src={user.employee.profilePhoto}
                alt={user.employee.firstName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-black text-brand-600 dark:text-brand-300">
                {user?.employee?.firstName?.[0] || 'E'}{user?.employee?.lastName?.[0] || 'M'}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'Employee Console'}
              </h1>
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                {user?.employee?.designation || user?.role || 'Staff'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Employee ID: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{user?.employee?.employeeCode || 'EMP-001'}</span> • Mark your presence using GPS &amp; Live Camera.
            </p>
          </div>
        </div>

        {shift && (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 self-start sm:self-center">
            <Clock className="h-4 w-4 text-brand-600" />
            <span>
              {shift.name} ({shift.startTime} - {shift.endTime})
            </span>
          </div>
        )}
      </div>

      {punchFeedback && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 text-xs font-semibold ${
            punchFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {punchFeedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{punchFeedback.message}</span>
          </div>
          {punchFeedback.type === 'error' && (
            <Link
              href="/attendance/exceptions"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 self-start sm:self-auto"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Submit Attendance Exception Request</span>
            </Link>
          )}
        </div>
      )}

      {/* Geofence / Accuracy Guidance Alert */}
      {currentGps && (!currentGps.isWithinGeofence || currentGps.accuracy > 30) && !isCheckedIn && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-bold">
                {!currentGps.isWithinGeofence
                  ? 'Outside Registered Geofence'
                  : 'Low GPS Accuracy Detected (> 30m)'}
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                {!currentGps.isWithinGeofence
                  ? 'Attendance requires physical presence within office radius, or an approved exception request.'
                  : 'Please step near a window for better satellite reception, or submit an exception.'}
              </p>
            </div>
          </div>
          <Link
            href="/attendance/exceptions"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 self-start sm:self-auto"
          >
            Submit Exception Request →
          </Link>
        </div>
      )}

      {/* Main Punch Station Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 p-8 text-center text-white">
          <p className="text-xs font-semibold tracking-wider uppercase text-brand-300">
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="mt-2 font-mono text-5xl font-extrabold tracking-tight sm:text-6xl">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <p className="mt-2 text-xs text-slate-300">
            Server Timezone: Asia/Kolkata (IST) • Geofence Protection Active
          </p>
        </div>

        {/* Punch Status Details */}
        <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {/* Check In Info */}
          <div className="p-6 text-center">
            <span className="text-xs font-medium text-slate-400">TODAY&apos;S CHECK-IN</span>
            <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {record?.checkInTime
                ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Not Checked In'}
            </div>
            {record?.checkInTime && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <Check className="h-3 w-3" />
                Verified ({record.status})
              </span>
            )}
          </div>

          {/* Check Out Info */}
          <div className="p-6 text-center">
            <span className="text-xs font-medium text-slate-400">TODAY&apos;S CHECK-OUT</span>
            <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {record?.checkOutTime
                ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Not Checked Out'}
            </div>
            {record?.checkOutTime ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                Shift Completed
              </span>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">
                Awaiting Punch Out
              </span>
            )}
          </div>

          {/* Working Hours */}
          <div className="p-6 text-center">
            <span className="text-xs font-medium text-slate-400">WORKING HOURS</span>
            <div className="mt-2 text-xl font-bold text-brand-600 dark:text-brand-400">
              {isCheckedOut
                ? `${record.totalHours} hrs`
                : isCheckedIn
                ? elapsedHours
                : '0h 0m'}
            </div>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">
              {isCheckedIn && !isCheckedOut ? 'In Progress' : 'Threshold: 8.0 hrs'}
            </span>
          </div>
        </div>

        {/* Action Buttons: Check In & Check Out */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={handleOpenCheckIn}
              disabled={isCheckedIn || submitting}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold shadow-lg transition-all sm:w-64 ${
                isCheckedIn
                  ? 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  : 'bg-emerald-600 text-white shadow-emerald-500/25 hover:bg-emerald-700'
              }`}
            >
              <LogIn className="h-5 w-5" />
              <span>{isCheckedIn ? 'Checked In' : 'Check In (Live Selfie)'}</span>
            </button>

            <button
              onClick={handleOpenCheckOut}
              disabled={!isCheckedIn || isCheckedOut || submitting}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold shadow-lg transition-all sm:w-64 ${
                !isCheckedIn || isCheckedOut
                  ? 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  : 'bg-brand-600 text-white shadow-brand-500/25 hover:bg-brand-700'
              }`}
            >
              <LogOut className="h-5 w-5" />
              <span>{isCheckedOut ? 'Checked Out' : 'Check Out'}</span>
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            GPS geofence distance is independently validated by the server before recording punch.
          </p>
        </div>
      </div>

      {/* Grid: GPS Geofence Badge & Leave Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* GPS Geofence Radar Card */}
        {branch && (
          <GPSStatusBadge
            officeLat={branch.latitude}
            officeLon={branch.longitude}
            allowedRadiusMeters={branch.radiusMeters || 50}
            officeName={branch.name}
            onLocationUpdate={(loc) => setCurrentGps(loc)}
          />
        )}

        {/* Quick Leave Overview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Leave Quota & Balances</h3>
            </div>
            <a href="/leaves" className="text-xs font-semibold text-brand-600 hover:underline">
              Apply Leave →
            </a>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
              <span className="text-[11px] font-medium text-slate-400">Casual Leave</span>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">12</p>
              <span className="text-[10px] text-emerald-600">Available</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
              <span className="text-[11px] font-medium text-slate-400">Sick Leave</span>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">10</p>
              <span className="text-[10px] text-emerald-600">Available</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
              <span className="text-[11px] font-medium text-slate-400">Earned Leave</span>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">15</p>
              <span className="text-[10px] text-emerald-600">Available</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
              <span className="text-[11px] font-medium text-slate-400">Remote WFH</span>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">24</p>
              <span className="text-[10px] text-indigo-600">Days/Yr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Camera Modal for Front Selfie Verification */}
      <LiveCameraModal
        isOpen={isCameraModalOpen}
        title={cameraModalMode === 'CHECK_IN' ? 'Check-In Live Selfie Verification' : 'Check-Out Photo Verification'}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handlePhotoCaptured}
      />
    </div>
  );
}
