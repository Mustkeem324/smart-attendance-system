'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { MapPin, Navigation, ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { calculateHaversineDistanceMeters } from '@/lib/geo';

export default function GPSVerificationPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [testLat, setTestLat] = useState('28.6140');
  const [testLon, setTestLon] = useState('77.2091');
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((d) => {
        if (d.branches && d.branches.length > 0) {
          setBranches(d.branches);
          setSelectedBranch(d.branches[0]);
          setTestLat(String(d.branches[0].latitude));
          setTestLon(String(d.branches[0].longitude));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCalculate = useCallback(() => {
    if (!selectedBranch) return;
    const lat = parseFloat(testLat);
    const lon = parseFloat(testLon);

    const dist = calculateHaversineDistanceMeters(
      lat,
      lon,
      selectedBranch.latitude,
      selectedBranch.longitude
    );

    const isInside = dist <= selectedBranch.radiusMeters;

    setCalcResult({
      distanceMeters: dist,
      isInside,
      radiusMeters: selectedBranch.radiusMeters,
      officeLat: selectedBranch.latitude,
      officeLon: selectedBranch.longitude,
      testLat: lat,
      testLon: lon,
    });
  }, [selectedBranch, testLat, testLon]);

  useEffect(() => {
    if (selectedBranch) {
      handleCalculate();
    }
  }, [selectedBranch, handleCalculate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          GPS Geofencing & Anti-Spoofing Verification Center
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Independent server-side Haversine geodesic validation, multi-branch geofence rules, and telemetry anti-spoofing diagnostics.
        </p>
      </div>

      {/* Grid: Interactive Coordinate Simulator & Security Checklist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Simulator Column */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                <Navigation className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Interactive Geofence Simulator
              </h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              Haversine Engine Active
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {/* Branch Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Office Branch
              </label>
              <select
                value={selectedBranch?.id || ''}
                onChange={(e) => {
                  const b = branches.find((item) => item.id === e.target.value);
                  setSelectedBranch(b || null);
                  if (b) {
                    setTestLat(String(b.latitude));
                    setTestLon(String(b.longitude));
                  }
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium outline-none dark:border-slate-800 dark:bg-slate-800"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.radiusMeters}m Geofence Radius • Lat: {b.latitude}, Lon: {b.longitude})
                  </option>
                ))}
              </select>
            </div>

            {/* Simulated Latitude & Longitude */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Simulated Employee Latitude
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={testLat}
                  onChange={(e) => setTestLat(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Simulated Employee Longitude
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={testLon}
                  onChange={(e) => setTestLon(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono outline-none dark:border-slate-800 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[11px] font-medium text-slate-400">Quick Test Positions:</span>
              <button
                type="button"
                onClick={() => {
                  if (selectedBranch) {
                    setTestLat(String(selectedBranch.latitude));
                    setTestLon(String(selectedBranch.longitude));
                  }
                }}
                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                0m (Exact Office Center)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedBranch) {
                    setTestLat(String(selectedBranch.latitude + 0.00025));
                    setTestLon(String(selectedBranch.longitude + 0.00025));
                  }
                }}
                className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
              >
                ~35m (Inside 50m Radius)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedBranch) {
                    setTestLat(String(selectedBranch.latitude + 0.001));
                    setTestLon(String(selectedBranch.longitude + 0.001));
                  }
                }}
                className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
              >
                ~140m (Outside 50m Radius)
              </button>
            </div>

            <button
              onClick={handleCalculate}
              className="mt-2 w-full rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-700"
            >
              Re-Calculate Geodesic Haversine Distance
            </button>

            {/* Calculation Result Display */}
            {calcResult && (
              <div
                className={`mt-4 rounded-2xl p-5 ${
                  calcResult.isInside
                    ? 'border border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {calcResult.isInside ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                    )}
                    <span className="text-sm font-bold">
                      {calcResult.isInside
                        ? 'Attendance Allowed: Within Geofence'
                        : 'Attendance Rejected: Outside Geofence'}
                    </span>
                  </div>
                  <span className="text-xl font-extrabold font-mono">
                    {calcResult.distanceMeters.toFixed(1)} meters
                  </span>
                </div>
                <p className="mt-2 text-xs">
                  Branch radius limit is{' '}
                  <span className="font-bold">{calcResult.radiusMeters}m</span>. Employee is{' '}
                  <span className="font-bold">
                    {calcResult.distanceMeters.toFixed(1)}m
                  </span>{' '}
                  away from {selectedBranch?.name}.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Security & Anti-Spoofing Protocols */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <ShieldCheck className="h-5 w-5 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Multi-Layer Telemetry Security
              </h2>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="font-bold text-slate-900 dark:text-white">
                  1. Server-Side Distance Authority
                </span>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Client coordinates are re-evaluated strictly on the server against verified office coordinates.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="font-bold text-slate-900 dark:text-white">
                  2. Synthetic Accuracy Detection
                </span>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Unrealistically exact accuracy (0.0m) or excessive drift (&gt;500m) is flagged for mock location inspection.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="font-bold text-slate-900 dark:text-white">
                  3. Browser vs Native Limitations
                </span>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Per production guidelines, browser GPS cannot guarantee mock prevention; pair with live selfie verification and device logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
