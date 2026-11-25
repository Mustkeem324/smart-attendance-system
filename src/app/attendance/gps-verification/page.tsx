'use client';

import React, { useCallback, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
} from 'lucide-react';
import { calculateHaversineDistanceMeters } from '@/lib/geo';
import { useUi } from '@/components/providers/UiProvider';

const LiveGeofenceMap = dynamic(() => import('@/components/maps/LiveGeofenceMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-500 dark:bg-slate-800">
      Loading geofence map...
    </div>
  ),
});

export default function GPSVerificationPage() {
  const { toast } = useUi();
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [testLat, setTestLat] = useState('28.6140');
  const [testLon, setTestLon] = useState('77.2091');
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

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
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

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

  const handleUseBrowserGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTestLat(pos.coords.latitude.toFixed(6));
        setTestLon(pos.coords.longitude.toFixed(6));
        setLocating(false);
        toast.success(`Captured device location (±${Math.round(pos.coords.accuracy)}m accuracy).`);
      },
      (err) => {
        setLocating(false);
        toast.warning(err.message || 'Location permission was declined.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          GPS Geofencing &amp; Location Verification Center
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Inspect live branch perimeters on an interactive map, verify coordinates against configurable 50m–100m geofences, and review location integrity rules.
        </p>
      </div>

      {/* Interactive Leaflet Map */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0F122B]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#6538ED]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Live Branch Geofence Boundary Map
            </h2>
          </div>
          {calcResult && (
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                calcResult.isInside
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              Test Pin: {calcResult.distanceMeters.toFixed(1)}m from {selectedBranch?.name}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-500 dark:bg-slate-800">
            Loading branch coordinates...
          </div>
        ) : (
          <LiveGeofenceMap
            officeLocations={branches.map((b) => ({
              id: b.id,
              name: b.name,
              code: b.code,
              latitude: Number(b.latitude),
              longitude: Number(b.longitude),
              radiusMeters: Number(b.radiusMeters) || 50,
              assignedEmployeesCount: b._count?.employees || 0,
            }))}
            punchMarkers={
              calcResult && Number.isFinite(calcResult.testLat) && Number.isFinite(calcResult.testLon)
                ? [
                    {
                      id: 'verification-probe',
                      type: 'PUNCH',
                      employeeName: 'Verification Probe Coordinate',
                      employeeCode: 'PROBE',
                      latitude: calcResult.testLat,
                      longitude: calcResult.testLon,
                      distanceMeters: calcResult.distanceMeters,
                      isWithinGeofence: calcResult.isInside,
                      status: calcResult.isInside ? 'INSIDE_GEOFENCE' : 'OUTSIDE_GEOFENCE',
                    },
                  ]
                : []
            }
            className="h-80 rounded-2xl"
          />
        )}
      </div>

      {/* Coordinate Verification Tester & Security Rules */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0F122B] lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6538ED]/10 text-[#6538ED]">
                <Navigation className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Geofence Boundary Verification Tool
              </h2>
            </div>

            <button
              type="button"
              onClick={handleUseBrowserGps}
              disabled={locating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#6538ED] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Crosshair className="h-3.5 w-3.5 text-[#6538ED]" />
              <span>{locating ? 'Locating...' : 'Use Browser GPS'}</span>
            </button>
          </div>

          <div className="mt-5 space-y-4">
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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.radiusMeters}m Radius • {b.latitude}, {b.longitude})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Check-In Latitude
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={testLat}
                  onChange={(e) => setTestLat(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Check-In Longitude
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={testLon}
                  onChange={(e) => setTestLon(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono outline-none focus:border-[#6538ED] dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-medium text-slate-400">Reference Points:</span>
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
                0m (Branch Center)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedBranch) {
                    setTestLat(String((selectedBranch.latitude + 0.00025).toFixed(6)));
                    setTestLon(String((selectedBranch.longitude + 0.00025).toFixed(6)));
                  }
                }}
                className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
              >
                ~35m (Inside 50m Boundary)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedBranch) {
                    setTestLat(String((selectedBranch.latitude + 0.0012).toFixed(6)));
                    setTestLon(String((selectedBranch.longitude + 0.0012).toFixed(6)));
                  }
                }}
                className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
              >
                ~175m (Outside Boundary)
              </button>
            </div>

            <button
              type="button"
              onClick={handleCalculate}
              className="mt-2 w-full rounded-xl bg-[#6538ED] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#562BD4] transition"
            >
              Verify Coordinate Against Branch Geofence
            </button>

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
                        : 'Attendance Flagged: Outside Geofence'}
                    </span>
                  </div>
                  <span className="text-xl font-extrabold font-mono">
                    {calcResult.distanceMeters.toFixed(1)}m
                  </span>
                </div>
                <p className="mt-2 text-xs">
                  Branch radius limit is <span className="font-bold">{calcResult.radiusMeters}m</span>. Measured distance is{' '}
                  <span className="font-bold">{calcResult.distanceMeters.toFixed(1)}m</span> from {selectedBranch?.name}.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0F122B]">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-white/10">
            <ShieldCheck className="h-5 w-5 text-[#6538ED]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Location Verification Policy
            </h2>
          </div>

          <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="font-bold text-slate-900 dark:text-white">1. Independent Radius Check</span>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Coordinates submitted during punch-in are validated against active branch perimeters on every request.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="font-bold text-slate-900 dark:text-white">2. Signal Accuracy Screening</span>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Low-precision signals and anomalous accuracy values are flagged into Attendance Exceptions for review.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="font-bold text-slate-900 dark:text-white">3. Permission Respect</span>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Location access is requested only when actively checking in or testing coordinates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
