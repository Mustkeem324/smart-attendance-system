'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { calculateHaversineDistanceMeters } from '@/lib/geo';

interface GPSStatusBadgeProps {
  officeLat: number;
  officeLon: number;
  allowedRadiusMeters: number;
  officeName: string;
  onLocationUpdate?: (coords: { latitude: number; longitude: number; accuracy: number; isWithinGeofence: boolean }) => void;
}

export default function GPSStatusBadge({
  officeLat,
  officeLon,
  allowedRadiusMeters = 50,
  officeName,
  onLocationUpdate,
}: GPSStatusBadgeProps) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithin, setIsWithin] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Keep the latest callback in a ref so a new inline prop does not retrigger geolocation
  const onLocationUpdateRef = useRef(onLocationUpdate);
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  const requestLocation = useCallback(() => {
    setIsLocating(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        const dist = calculateHaversineDistanceMeters(lat, lon, officeLat, officeLon);
        const within = dist <= allowedRadiusMeters;

        setCoords({ latitude: lat, longitude: lon, accuracy: acc });
        setDistance(dist);
        setIsWithin(within);
        setIsLocating(false);

        onLocationUpdateRef.current?.({
          latitude: lat,
          longitude: lon,
          accuracy: acc,
          isWithinGeofence: within,
        });
      },
      (err) => {
        console.warn('GPS error:', err);
        // If permission denied or unavailable in headless/sandbox environment, default to near-office coordinates
        setGpsError('Could not obtain live GPS. Click "Simulate Office Location" to test.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [officeLat, officeLon, allowedRadiusMeters]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const simulateOfficeLocation = () => {
    // Exact location with small random jitter (within 5-10 meters)
    const jitterLat = officeLat + (Math.random() - 0.5) * 0.0001;
    const jitterLon = officeLon + (Math.random() - 0.5) * 0.0001;
    const dist = calculateHaversineDistanceMeters(jitterLat, jitterLon, officeLat, officeLon);
    const within = dist <= allowedRadiusMeters;

    setCoords({ latitude: jitterLat, longitude: jitterLon, accuracy: 12.0 });
    setDistance(dist);
    setIsWithin(within);
    setGpsError(null);

    onLocationUpdateRef.current?.({
      latitude: jitterLat,
      longitude: jitterLon,
      accuracy: 12.0,
      isWithinGeofence: within,
    });
  };

  const simulateFarLocation = () => {
    // 5 km away
    const farLat = officeLat + 0.045;
    const farLon = officeLon + 0.045;
    const dist = calculateHaversineDistanceMeters(farLat, farLon, officeLat, officeLon);

    setCoords({ latitude: farLat, longitude: farLon, accuracy: 15.0 });
    setDistance(dist);
    setIsWithin(false);
    setGpsError(null);

    onLocationUpdateRef.current?.({
      latitude: farLat,
      longitude: farLon,
      accuracy: 15.0,
      isWithinGeofence: false,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
            <Navigation className="h-4 w-4" />
            {isWithin && <span className="animate-pulse-ring absolute h-full w-full rounded-xl bg-emerald-400"></span>}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">GPS Geofence Status</span>
            <p className="text-[11px] text-slate-400">{officeName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={requestLocation}
            disabled={isLocating}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refresh GPS"
          >
            <RefreshCw className={`h-3 w-3 ${isLocating ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {gpsError ? (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">{gpsError}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={simulateOfficeLocation}
                  className="rounded bg-amber-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-700"
                >
                  Simulate Office Location (Inside)
                </button>
                <button
                  type="button"
                  onClick={simulateFarLocation}
                  className="rounded bg-slate-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-700"
                >
                  Simulate Far (Outside)
                </button>
              </div>
            </div>
          </div>
        ) : coords && distance !== null ? (
          <div className="space-y-2">
            <div
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-medium ${
                isWithin
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {isWithin ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                )}
                <div>
                  <span className="font-bold">
                    {isWithin ? 'Within Office Geofence' : 'Outside Office Geofence'}
                  </span>
                  <p className="text-[11px] opacity-90">
                    Distance: <span className="font-bold">{distance.toFixed(1)}m</span> (Allowed radius: {allowedRadiusMeters}m)
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase shadow-sm dark:bg-slate-900/80">
                {isWithin ? 'Eligible' : 'Blocked'}
              </span>
            </div>

            <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
              <span>Lat: {coords.latitude.toFixed(5)}, Lon: {coords.longitude.toFixed(5)}</span>
              <span>Accuracy: ±{coords.accuracy.toFixed(1)}m</span>
            </div>

            {/* Quick Location Simulation */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <span className="text-[10px] text-slate-400">Simulation:</span>
              <button
                type="button"
                onClick={simulateOfficeLocation}
                className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                Set At Office ({'<'}10m)
              </button>
              <button
                type="button"
                onClick={simulateFarLocation}
                className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300"
              >
                Set Outside ({'>'}1km)
              </button>
            </div>
          </div>
        ) : (
          <div className="py-2 text-center text-xs text-slate-400">Acquiring high-precision GPS lock...</div>
        )}
      </div>
    </div>
  );
}
