'use client';

import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle2, AlertCircle, MapPin, Calendar, Clock, Search, X } from 'lucide-react';

export default function CameraVerificationPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/attendance/history')
      .then((r) => r.json())
      .then((d) => {
        if (d.records) {
          // Filter to records that have photos
          setRecords(d.records.filter((r: any) => r.checkInPhoto || r.checkOutPhoto));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter((r) => {
    if (!search) return true;
    const name = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
    const code = (r.employee?.employeeCode || '').toLowerCase();
    return name.includes(search.toLowerCase()) || code.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Live Camera & Selfie Verification Console
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Biometric presence verification stream. View submitted selfie photographs and timestamps.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by employee name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs outline-none"
        />
      </div>

      {/* Grid of Verified Photo Cards */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading verified photograph gallery...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          No selfie photographs found matching query.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((record) => (
            <div
              key={record.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Photo preview */}
              <div
                onClick={() => setSelectedImage(record.checkInPhoto)}
                className="relative h-48 w-full cursor-pointer bg-slate-950"
              >
                <img
                  src={record.checkInPhoto}
                  alt="Verified selfie"
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white ">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>Verified Check-In</span>
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {record.employee?.firstName} {record.employee?.lastName}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {record.employee?.employeeCode}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{record.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '--'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {record.checkInDistanceMeters !== null
                        ? `${record.checkInDistanceMeters.toFixed(1)}m from office`
                        : 'Geofence validated'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enlarged Photo Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 ">
          <div className="relative max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Live Attendance Photo Inspection
              </span>
              <button
                onClick={() => setSelectedImage(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={selectedImage}
              alt="Live attendance selfie"
              className="h-80 w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}
