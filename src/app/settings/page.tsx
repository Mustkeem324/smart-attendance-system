'use client';

import React, { useState } from 'react';
import { Settings, Shield, MapPin, Camera, Clock, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const [policies, setPolicies] = useState({
    defaultGeofenceRadius: 50,
    enforceSelfie: true,
    enforceGeofence: true,
    allowOutsidePunchException: true,
    lateGraceMinutes: 15,
    halfDayThresholdHours: 4.5,
    fullDayThresholdHours: 8.0,
    antiMockDetection: true,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          System Policies & Attendance Rules
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure organization-wide GPS geofence radiuses, camera selfie enforcement, and grace periods.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>Organizational attendance policies updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Geofence & Location Policies */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <MapPin className="h-5 w-5 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              GPS Geofence & Distance Rules
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Default Geofence Radius (Meters)
              </label>
              <select
                value={policies.defaultGeofenceRadius}
                onChange={(e) =>
                  setPolicies({ ...policies, defaultGeofenceRadius: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
              >
                <option value={30}>30 meters (High Density Campus)</option>
                <option value={50}>50 meters (Standard Recommended)</option>
                <option value={100}>100 meters (Sprawling Tech Park)</option>
                <option value={200}>200 meters (Expanded Perimeter)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-4 sm:pt-6">
              <input
                type="checkbox"
                id="enforceGeofence"
                checked={policies.enforceGeofence}
                onChange={(e) => setPolicies({ ...policies, enforceGeofence: e.target.checked })}
                className="h-4 w-4 rounded text-brand-600"
              />
              <label htmlFor="enforceGeofence" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Strict Geofence Enforcement (Punches outside radius rejected)
              </label>
            </div>
          </div>
        </div>

        {/* Biometric & Camera Policies */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <Camera className="h-5 w-5 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Biometric & Live Camera Selfie Verification
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enforceSelfie"
                checked={policies.enforceSelfie}
                onChange={(e) => setPolicies({ ...policies, enforceSelfie: e.target.checked })}
                className="h-4 w-4 rounded text-brand-600"
              />
              <label htmlFor="enforceSelfie" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mandatory Live Selfie for Check-In
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="antiMockDetection"
                checked={policies.antiMockDetection}
                onChange={(e) => setPolicies({ ...policies, antiMockDetection: e.target.checked })}
                className="h-4 w-4 rounded text-brand-600"
              />
              <label htmlFor="antiMockDetection" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Telemetry Heuristics & Synthetic Accuracy Mock Detection
              </label>
            </div>
          </div>
        </div>

        {/* Shift & Threshold Hours */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <Clock className="h-5 w-5 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Working Thresholds & Grace Periods
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Late Arrival Grace Period (Minutes)
              </label>
              <input
                type="number"
                value={policies.lateGraceMinutes}
                onChange={(e) =>
                  setPolicies({ ...policies, lateGraceMinutes: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Half-Day Minimum Hours
              </label>
              <input
                type="number"
                step="0.5"
                value={policies.halfDayThresholdHours}
                onChange={(e) =>
                  setPolicies({ ...policies, halfDayThresholdHours: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full-Day Working Hours
              </label>
              <input
                type="number"
                step="0.5"
                value={policies.fullDayThresholdHours}
                onChange={(e) =>
                  setPolicies({ ...policies, fullDayThresholdHours: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-700"
          >
            <Save className="h-4 w-4" />
            <span>Save Policies</span>
          </button>
        </div>
      </form>
    </div>
  );
}
